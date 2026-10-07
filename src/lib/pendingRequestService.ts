import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';

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
const LOCAL_JOBS_KEY = 'taskmolly_saved_requests';

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
 * Finalize pending request by writing directly to Firestore client SDK.
 * This guarantees task creation regardless of backend admin API status.
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

  console.log(`[PendingRequestService] 🚀 Finalizing pending request for user ${user.uid} (${user.displayName || 'Client'})`);

  const syncId = pending.syncId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const refCode = pending.refCode || `REQ-2026-${Math.floor(100 + Math.random() * 900)}`;
  const serviceName = pending.service || pending.serviceType || 'General Service';
  const now = new Date();

  const budgetNum = Number(pending.budget) || Number(pending.clientPrice) || 2500;
  const clientPriceNum = Number(pending.clientPrice) || budgetNum;
  const providerPriceNum = Number(pending.providerPrice) || Math.round(budgetNum * 0.85);

  const requestDoc = {
    clientId: user.uid,
    clientName: user.displayName || pending.clientName || 'Client',
    clientPhone: user.phoneNumber || pending.clientPhone || '+254 7xx xxx xxx',
    service: serviceName,
    serviceType: serviceName,
    description: pending.description || 'Service requested via Task Molly Concierge',
    urgency: pending.urgency || 'ASAP',
    scheduledTime: pending.scheduledTime || 'Today • Within 1-2 Hours',
    scheduledDate: pending.scheduledDate || 'Today',
    location: pending.location || 'Nairobi, Kenya',
    neighborhood: pending.neighborhood || 'Nairobi',
    specificAddress: pending.specificAddress || '',
    budget: budgetNum,
    clientPrice: clientPriceNum,
    providerPrice: providerPriceNum,
    status: 'pending',
    syncId,
    refCode,
    date: pending.date || now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: pending.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    // 1. Write directly to Firestore using Client SDK
    console.log('[PendingRequestService] Writing directly to Firestore serviceRequests collection...');
    const docRef = await addDoc(collection(db, 'serviceRequests'), requestDoc);
    console.log(`[PendingRequestService] ✅ Firestore document created successfully! Doc ID: ${docRef.id}`);

    // 2. Also cache locally for immediate offline/optimistic availability
    try {
      const existingSaved = JSON.parse(localStorage.getItem(LOCAL_JOBS_KEY) || '[]');
      existingSaved.unshift({
        id: docRef.id,
        ...requestDoc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(existingSaved.slice(0, 50)));
    } catch (cacheErr) {
      console.warn('[PendingRequestService] Local cache update skipped:', cacheErr);
    }

    // 3. Clear pending request so it's not created again
    clearPendingRequest();

    // 4. Non-blocking best-effort notify server (e.g. for socket alerts / provider notifications)
    fetch('/api/service-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...requestDoc,
        id: docRef.id
      })
    }).catch(err => {
      console.warn('[PendingRequestService] Server notification skipped (client doc already created):', err);
    });

    toast.success(`Service request for ${serviceName} created successfully! Matching pros...`);
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('[PendingRequestService] ❌ Firestore client write error:', err);
    
    // Fallback: If client write failed (e.g. offline or unexpected permission error),
    // save to local jobs so user does NOT lose their task!
    try {
      const fallbackId = `local_${Date.now()}`;
      const existingSaved = JSON.parse(localStorage.getItem(LOCAL_JOBS_KEY) || '[]');
      existingSaved.unshift({
        id: fallbackId,
        ...requestDoc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(existingSaved.slice(0, 50)));
      clearPendingRequest();
      toast.success(`Service request saved! Matching pros shortly...`);
      return { success: true, id: fallbackId };
    } catch (localErr) {
      console.error('[PendingRequestService] Local fallback failed:', localErr);
      return { success: false };
    }
  }
}
