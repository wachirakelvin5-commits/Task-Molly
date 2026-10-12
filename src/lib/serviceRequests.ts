import {
  addDoc,
  arrayUnion,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getServiceCategory } from './requestModel';

export * from './requestModel';

export interface NewServiceRequest {
  serviceType: string;
  description?: string;
  budget?: number | string;
  location?: string;
  urgency?: string;
  clientName?: string;
  clientPhone?: string;
  [extra: string]: any;
}

function toNumber(value: any): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Creates a pending request owned by `clientId`. Returns the new document id. */
export async function createServiceRequest(clientId: string, request: NewServiceRequest): Promise<string> {
  const { budget, clientPrice, providerPrice, location, description, ...rest } = request;
  const budgetNum = toNumber(budget) || toNumber(clientPrice);

  // Drop undefined values (Firestore rejects them) and fields the rules reserve for later stages.
  const extras = Object.fromEntries(
    Object.entries(rest).filter(([key, value]) =>
      value !== undefined && !['status', 'providerId', 'providerName', 'clientId', 'id'].includes(key)
    )
  );

  const ref = await addDoc(collection(db, 'serviceRequests'), {
    ...extras,
    clientId,
    serviceType: request.serviceType.slice(0, 100),
    serviceCategory: getServiceCategory(request.serviceType),
    description: (description || '').slice(0, 2000),
    location: (location || 'Nairobi').slice(0, 200),
    budget: budgetNum,
    clientPrice: budgetNum,
    providerPrice: toNumber(providerPrice) || Math.round(budgetNum * 0.85),
    status: 'pending',
    createdAt: serverTimestamp(),
    postedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

function update(requestId: string, fields: Record<string, any>) {
  return updateDoc(doc(db, 'serviceRequests', requestId), { ...fields, updatedAt: serverTimestamp() });
}

// ---- Provider actions ----

export function acceptRequest(requestId: string, provider: { uid: string; displayName?: string }) {
  return update(requestId, {
    status: 'accepted',
    providerId: provider.uid,
    providerName: (provider.displayName || 'Service Provider').slice(0, 100),
    acceptedAt: serverTimestamp(),
  });
}

export function withdrawAcceptance(requestId: string) {
  return update(requestId, {
    status: 'pending',
    providerId: deleteField(),
    providerName: deleteField(),
    acceptedAt: deleteField(),
  });
}

export function startJob(requestId: string) {
  return update(requestId, { status: 'in-progress', startedAt: serverTimestamp() });
}

export function markJobComplete(requestId: string) {
  return update(requestId, { status: 'awaiting-confirmation', providerCompletedAt: serverTimestamp() });
}

// ---- Client actions ----

export function confirmProvider(requestId: string) {
  return update(requestId, { status: 'assigned', confirmedAt: serverTimestamp() });
}

export function rejectProvider(requestId: string, providerId: string) {
  return update(requestId, {
    status: 'pending',
    providerId: deleteField(),
    providerName: deleteField(),
    acceptedAt: deleteField(),
    rejectedProviderIds: arrayUnion(providerId),
  });
}

export function confirmCompletion(requestId: string) {
  return update(requestId, { status: 'completed', completedAt: serverTimestamp() });
}

export function reportIssue(requestId: string) {
  return update(requestId, { issueReportedAt: serverTimestamp() });
}

export function cancelRequest(requestId: string) {
  return update(requestId, { status: 'cancelled', cancelledAt: serverTimestamp() });
}

/** Re-offers an expired pending request to providers for another expiry window. */
export function repostRequest(requestId: string) {
  return update(requestId, { postedAt: serverTimestamp() });
}
