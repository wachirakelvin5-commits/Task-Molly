import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceVerification, ServiceVerificationDoc, UserProfile } from '../types';
import { getCatalogServiceCategory, ALL_SERVICES_CATALOG } from '../data/serviceCatalog';
import { ServiceCategory } from './requestModel';

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

/** Loads provider's service verifications from localStorage or Firestore */
export async function getProviderVerifications(uid: string): Promise<Record<string, ServiceVerification>> {
  if (!uid) return {};

  // Check local storage cache first
  let cached: Record<string, ServiceVerification> = {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read verifications from local storage:", e);
  }

  // Check user profile in Firestore
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      const firestoreVerifications = (data.serviceVerifications as Record<string, ServiceVerification>) || {};
      const merged = { ...cached, ...firestoreVerifications };
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch verifications from firestore:", err);
  }

  return cached;
}

/** Saves or updates a service verification and synchronizes high-level categories */
export async function saveServiceVerification(
  uid: string,
  verification: ServiceVerification,
  currentUser: UserProfile
): Promise<void> {
  if (!uid) return;

  // 1. Update local storage cache
  let allVerifications: Record<string, ServiceVerification> = {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    if (raw) allVerifications = JSON.parse(raw);
  } catch (e) {}

  allVerifications[verification.serviceId] = verification;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(allVerifications));

  // 2. Compute updated service categories
  // Look at all verified services and map them to the 5 high-level categories
  const verifiedServices = Object.values(allVerifications).filter(v => v.status === 'verified');
  const derivedCategories = new Set<ServiceCategory>();

  for (const v of verifiedServices) {
    const catalogItem = ALL_SERVICES_CATALOG.find(s => s.id === v.serviceId);
    if (catalogItem) {
      const cat = getCatalogServiceCategory(catalogItem);
      if (cat) derivedCategories.add(cat);
    }
  }

  // Also include any existing categories that the user already had
  const existingServices = currentUser.services || [];
  existingServices.forEach(s => {
    if (['Cleaning & Domestic', 'Plumbing & Water', 'Electrical & Solar', 'Repairs & Fundi', 'Outdoor & Relocation'].includes(s)) {
      derivedCategories.add(s as ServiceCategory);
    }
  });

  const updatedCategoriesList = Array.from(derivedCategories);

  // 3. Update mock user if dev/mock account
  const mockUserStr = localStorage.getItem('taskmolly_mock_user');
  if (mockUserStr) {
    try {
      const mockUser = JSON.parse(mockUserStr);
      mockUser.serviceVerifications = allVerifications;
      mockUser.services = updatedCategoriesList;
      localStorage.setItem('taskmolly_mock_user', JSON.stringify(mockUser));
    } catch (e) {}
  }

  // 4. Update Firestore user document
  try {
    const userRef = doc(db, 'users', uid);
    // Remove heavy dataUrls from firestore if size could be an issue or store compressed
    await updateDoc(userRef, {
      serviceVerifications: allVerifications,
      services: updatedCategoriesList
    });
  } catch (err) {
    console.warn("Could not save verification to Firestore (offline/local fallback):", err);
  }
}

/** Deactivates an active service offering */
export async function deactivateService(
  uid: string,
  serviceId: string,
  currentUser: UserProfile
): Promise<void> {
  if (!uid) return;

  let allVerifications: Record<string, ServiceVerification> = {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    if (raw) allVerifications = JSON.parse(raw);
  } catch (e) {}

  delete allVerifications[serviceId];
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(allVerifications));

  // Recompute categories
  const verifiedServices = Object.values(allVerifications).filter(v => v.status === 'verified');
  const derivedCategories = new Set<ServiceCategory>();

  for (const v of verifiedServices) {
    const catalogItem = ALL_SERVICES_CATALOG.find(s => s.id === v.serviceId);
    if (catalogItem) {
      const cat = getCatalogServiceCategory(catalogItem);
      if (cat) derivedCategories.add(cat);
    }
  }

  const updatedCategoriesList = Array.from(derivedCategories);

  // Update mock
  const mockUserStr = localStorage.getItem('taskmolly_mock_user');
  if (mockUserStr) {
    try {
      const mockUser = JSON.parse(mockUserStr);
      mockUser.serviceVerifications = allVerifications;
      mockUser.services = updatedCategoriesList;
      localStorage.setItem('taskmolly_mock_user', JSON.stringify(mockUser));
    } catch (e) {}
  }

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      serviceVerifications: allVerifications,
      services: updatedCategoriesList
    });
  } catch (err) {
    console.warn("Could not update Firestore after deactivation:", err);
  }
}
