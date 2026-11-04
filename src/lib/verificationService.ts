import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { syncProviderProfile } from './providerProfile';
import { ServiceVerification, UserProfile } from '../types';
import { getCatalogServiceCategory, ALL_SERVICES_CATALOG } from '../data/serviceCatalog';

export const STORAGE_KEY_PREFIX = 'taskmolly_provider_verifications_';

/** Compresses an image file via HTML canvas to a lightweight JPEG data URL */
export async function compressImageFile(file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // If PDF or non-image, read as data URL directly
    if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Verification documents live in providerVerifications/<uid>_<serviceId>, readable only by
 * the provider and the admins (see firestore.rules). Providers submit them for review; an
 * admin approves them on the admin site, which is what grants the service category.
 *
 * Older submissions were stored on the user record (users/<uid>.serviceVerifications); they
 * are still read so providers keep seeing them.
 */
export const VERIFICATIONS = 'providerVerifications';

export const verificationId = (uid: string, serviceId: string) => `${uid}_${serviceId}`;

/** The service category (one of the five) a catalog service belongs to. */
export function categoryForService(serviceId: string): string | undefined {
  const item = ALL_SERVICES_CATALOG.find(s => s.id === serviceId);
  return item ? getCatalogServiceCategory(item) || undefined : undefined;
}

// Demo sessions (AI Studio preview, no Firebase sign-in) keep everything in this browser.
const isLocalSession = () => !auth.currentUser;

function readLocal(uid: string): Record<string, ServiceVerification> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocal(uid: string, all: Record<string, ServiceVerification>) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(all));
  } catch {}
}

async function readLegacy(uid: string): Promise<Record<string, ServiceVerification>> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return (snap.data()?.serviceVerifications as Record<string, ServiceVerification>) || {};
  } catch {
    return {};
  }
}

const byService = (docs: { data: () => any }[]) => {
  const out: Record<string, ServiceVerification> = {};
  docs.forEach(d => {
    const v = d.data() as ServiceVerification;
    out[v.serviceId] = v;
  });
  return out;
};

/** Loads a provider's service verifications. */
export async function getProviderVerifications(uid: string): Promise<Record<string, ServiceVerification>> {
  if (!uid) return {};
  if (isLocalSession()) return readLocal(uid);

  const legacy = await readLegacy(uid);
  try {
    const snap = await getDocs(query(collection(db, VERIFICATIONS), where('uid', '==', uid)));
    return { ...legacy, ...byService(snap.docs) };
  } catch (err) {
    console.warn('Could not load verifications:', err);
    return legacy;
  }
}

/** Follows a provider's verifications live (status changes when an admin reviews them). */
export function subscribeProviderVerifications(
  uid: string,
  onChange: (verifications: Record<string, ServiceVerification>) => void,
): () => void {
  if (!uid || isLocalSession()) return () => {};
  let legacy: Record<string, ServiceVerification> = {};
  let latest: Record<string, ServiceVerification> = {};
  readLegacy(uid).then(l => {
    legacy = l;
    onChange({ ...legacy, ...latest });
  });
  return onSnapshot(
    query(collection(db, VERIFICATIONS), where('uid', '==', uid)),
    snap => {
      latest = byService(snap.docs);
      onChange({ ...legacy, ...latest });
    },
    err => console.warn('Could not follow verifications:', err),
  );
}

/** Firestore rejects undefined values; drop them. */
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Submits a service verification for review. It is always saved as pending: only an admin can
 * mark it verified (on the admin site), which is what lets the provider take jobs in that category.
 */
export async function saveServiceVerification(
  uid: string,
  verification: ServiceVerification,
  currentUser: UserProfile
): Promise<void> {
  if (!uid) return;

  const { reviewedAt, rejectionReason, ...rest } = verification;
  const submission: ServiceVerification = {
    ...rest,
    status: 'pending',
    categoryGroup: categoryForService(verification.serviceId) || verification.categoryGroup,
  };

  if (isLocalSession()) {
    writeLocal(uid, { ...readLocal(uid), [verification.serviceId]: submission });
    return;
  }

  // Errors reach the form, which tells the provider it was not sent.
  await setDoc(
    doc(db, VERIFICATIONS, verificationId(uid, verification.serviceId)),
    clean({
      ...submission,
      uid,
      providerName: currentUser.displayName || currentUser.email || '',
    }),
  );
}

/** Stops offering a service: removes its verification and, if no other verified service is in
 * the same category, drops that category from the provider's profile. */
export async function deactivateService(
  uid: string,
  serviceId: string,
  currentUser: UserProfile
): Promise<void> {
  if (!uid) return;

  if (isLocalSession()) {
    const all = readLocal(uid);
    delete all[serviceId];
    writeLocal(uid, all);
    return;
  }

  const all = await getProviderVerifications(uid);
  const category = categoryForService(serviceId);
  const stillCovered = Object.values(all).some(
    v => v.serviceId !== serviceId && v.status === 'verified' && categoryForService(v.serviceId) === category,
  );

  await deleteDoc(doc(db, VERIFICATIONS, verificationId(uid, serviceId))).catch(err =>
    console.warn('Could not remove verification:', err),
  );

  if (category && !stillCovered) {
    const userRef = doc(db, 'users', uid);
    const services: string[] = (await getDoc(userRef)).data()?.services || currentUser.services || [];
    if (services.includes(category)) {
      await updateDoc(userRef, { services: services.filter(s => s !== category) });
      await syncProviderProfile(uid).catch(err => console.warn('Could not update public profile:', err));
    }
  }
}
