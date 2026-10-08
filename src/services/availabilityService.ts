import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getServiceCategory, normalizeProviderCategories } from '../lib/serviceRequests';

export interface AvailabilityStatus {
  available: boolean;
  nextAvailableInMinutes?: number;
  message?: string;
}

export async function checkProviderAvailability(serviceType: string): Promise<AvailabilityStatus> {
  try {
    // Providers offer whole categories, so match on the request's category.
    // Fetch taskers first, then filter in memory to avoid complex indexing
    const category = getServiceCategory(serviceType);
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'tasker'),
      limit(50)
    );

    const providersSnapshot = await getDocs(providersQuery);
    const availableMatch = providersSnapshot.docs.find(doc => {
      const data = doc.data();
      return normalizeProviderCategories(data.services).includes(category) && data.isOnline === true;
    });

    if (availableMatch) {
      return { available: true };
    }

    return {
      available: false,
      nextAvailableInMinutes: 120,
      message: "No pros are currently online for this service."
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    // Generic fallback to be safe and not block the user
    return { available: true };
  }
}

// Helper to format the wait time for Molly
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} and ${remainingMins} minutes`;
}
