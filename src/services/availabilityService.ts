import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AvailabilityStatus {
  available: boolean;
  nextAvailableInMinutes?: number;
  message?: string;
}

export async function checkProviderAvailability(serviceType: string): Promise<AvailabilityStatus> {
  try {
    // 1. Check for available providers in this category
    // Fetch taskers first, then filter in memory to avoid complex indexing
    const providersQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'tasker'),
      limit(20)
    );
    
    const providersSnapshot = await getDocs(providersQuery);
    const availableMatch = providersSnapshot.docs.find(doc => {
      const data = doc.data();
      const services = data.services || [];
      return services.includes(serviceType) && data.isAvailable === true;
    });
    
    if (availableMatch) {
      return { available: true };
    }

    // 2. If no direct matches, check for any 'tasker' who is available in that category by looking at active tasks
    const ongoingTasksQuery = query(
      collection(db, 'serviceRequests'),
      where('serviceType', '==', serviceType),
      where('status', '==', 'assigned'),
      limit(5)
    );
    
    const tasksSnapshot = await getDocs(ongoingTasksQuery);
    
    if (tasksSnapshot.empty) {
      return { 
        available: false, 
        nextAvailableInMinutes: 120,
        message: "No pros are currently online for this service."
      };
    }

    const tasks = tasksSnapshot.docs.map(doc => doc.data());
    // Sort in memory to avoid orderBy index requirement
    tasks.sort((a, b) => {
      const timeA = a.estimatedCompletionAt instanceof Timestamp ? a.estimatedCompletionAt.toMillis() : new Date(a.estimatedCompletionAt).getTime();
      const timeB = b.estimatedCompletionAt instanceof Timestamp ? b.estimatedCompletionAt.toMillis() : new Date(b.estimatedCompletionAt).getTime();
      return timeA - timeB;
    });

    const taskData = tasks[0];
    const estimatedCompletionAt = taskData.estimatedCompletionAt; // ISO string or Timestamp
    
    let completionTimeMs: number;
    if (estimatedCompletionAt instanceof Timestamp) {
      completionTimeMs = estimatedCompletionAt.toMillis();
    } else {
      completionTimeMs = new Date(estimatedCompletionAt).getTime();
    }
    
    const now = Date.now();
    let diffInMinutes = Math.round((completionTimeMs - now) / (1000 * 60));
    
    if (diffInMinutes < 0) diffInMinutes = 30; // Fallback for stale tasks
    
    // Add 1-hour allowance as per user request
    const totalWaitMinutes = diffInMinutes + 60;
    
    return { 
      available: false, 
      nextAvailableInMinutes: totalWaitMinutes,
      message: `The next provider will be available in about ${Math.floor(totalWaitMinutes/60)}h ${totalWaitMinutes%60}m.`
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
