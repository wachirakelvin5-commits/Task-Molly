import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Public provider profile (providerProfiles/<uid>): the only provider details other people
 * can read. User records (users/<uid>) hold contact details and are private to the owner and
 * the admins (firestore.rules).
 */
export const PROVIDER_PROFILES = 'providerProfiles';

export interface ProviderProfile {
  uid: string;
  name: string;
  photo: string;
  services: string[];
  isOnline: boolean;
}

const safePhoto = (url: unknown) =>
  typeof url === 'string' && /^https?:\/\//.test(url) && url.length <= 1000 ? url : '';

/**
 * Copies the safe fields from the provider's own user record to their public profile.
 * Categories are copied as granted (the rules reject anything else), so call this after a
 * change to the user record. Skips the write when nothing changed.
 */
export async function syncProviderProfile(uid: string): Promise<void> {
  const user = (await getDoc(doc(db, 'users', uid))).data();
  if (!user || user.role !== 'tasker') return;

  const next: ProviderProfile = {
    uid,
    name: String(user.displayName || 'Provider').slice(0, 100),
    photo: safePhoto(user.photoURL),
    services: Array.isArray(user.services) ? user.services : [],
    isOnline: user.isOnline === true,
  };

  const ref = doc(db, PROVIDER_PROFILES, uid);
  const current = (await getDoc(ref)).data();
  const same =
    current &&
    current.name === next.name &&
    current.photo === next.photo &&
    current.isOnline === next.isOnline &&
    JSON.stringify(current.services || []) === JSON.stringify(next.services);
  if (same) return;

  await setDoc(ref, { ...next, updatedAt: serverTimestamp() });
}
