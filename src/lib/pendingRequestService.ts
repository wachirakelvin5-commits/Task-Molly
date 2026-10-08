import { toast } from 'sonner';
import { createServiceRequest } from './serviceRequests';

export interface PendingServiceRequestPayload {
  syncId?: string;
  refCode?: string;
  service?: string;
  serviceType: string;
  description: string;
  urgency: string;
  scheduledTime?: string;
  scheduledDate?: string;
  location?: string;
  neighborhood?: string;
  specificAddress?: string;
  budget?: number;
  clientPrice?: number;
  providerPrice?: number;
  clientName?: string;
  clientPhone?: string;
  status?: string;
  date?: string;
  time?: string;
  timestamp?: string;
}

const STORAGE_KEY = 'pending_service_request';

/**
 * Save pending service request to both sessionStorage and localStorage
 * so it survives login redirects across tabs and reloads.
 */
export function savePendingRequest(payload: PendingServiceRequestPayload): void {
  try {
    const dataStr = JSON.stringify(payload);
    sessionStorage.setItem(STORAGE_KEY, dataStr);
    localStorage.setItem(STORAGE_KEY, dataStr);
    console.log('[PendingRequestService] Stored pending request:', payload.syncId || payload.serviceType);
  } catch (err) {
    console.warn('[PendingRequestService] Could not store pending request:', err);
  }
}

/**
 * Retrieve pending service request from sessionStorage or localStorage.
 */
export function getPendingRequest(): PendingServiceRequestPayload | null {
  try {
    const dataStr = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!dataStr) return null;
    return JSON.parse(dataStr);
  } catch (err) {
    console.error('[PendingRequestService] Error parsing pending request:', err);
    return null;
  }
}

/**
 * Clear pending service request from both storages.
 */
export function clearPendingRequest(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[PendingRequestService] Cleared pending request from storage');
  } catch (err) {
    console.warn('[PendingRequestService] Error clearing storage:', err);
  }
}

/**
 * Finalize a request a guest filled in before logging in: create it for the now signed-in user.
 * On failure the pending request is kept so the caller can retry.
 */
export async function finalizePendingRequest(
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  }
): Promise<{ success: boolean; id?: string }> {
  const pending = getPendingRequest();
  if (!pending || !user.uid) {
    return { success: false };
  }

  const serviceName = pending.service || pending.serviceType || 'General Service';
  const now = new Date();

  try {
    const id = await createServiceRequest(user.uid, {
      ...pending,
      clientName: user.displayName || pending.clientName || 'Client',
      clientPhone: user.phoneNumber || pending.clientPhone || undefined,
      service: serviceName,
      serviceType: serviceName,
      description: pending.description || 'Service requested via Task Molly Concierge',
      urgency: pending.urgency || 'ASAP',
      location: pending.location || 'Nairobi, Kenya',
      budget: Number(pending.budget) || Number(pending.clientPrice) || 2500,
      date: pending.date || now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: pending.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    clearPendingRequest();
    toast.success(`Service request for ${serviceName} posted! Matching pros...`);
    return { success: true, id };
  } catch (err: any) {
    console.error('[PendingRequestService] Could not create request:', err);
    toast.error('We could not post your request yet. We will retry shortly.', { id: 'pending-request-retry' });
    return { success: false };
  }
}
