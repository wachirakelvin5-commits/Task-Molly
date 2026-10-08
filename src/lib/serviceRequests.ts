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

/**
 * Service request lifecycle (enforced by firestore.rules):
 *
 *   pending ──(provider accepts)──▶ accepted ──(client confirms)──▶ assigned
 *      ▲                              │
 *      └──(client rejects / provider withdraws)
 *
 *   assigned ──(provider starts)──▶ in-progress ──(provider marks done)──▶ awaiting-confirmation
 *   awaiting-confirmation ──(client signs off)──▶ completed
 *
 *   pending | accepted | assigned ──(client cancels)──▶ cancelled
 */
export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'in-progress'
  | 'awaiting-confirmation'
  | 'completed'
  | 'cancelled';

export const SERVICE_CATEGORIES = [
  'Cleaning & Domestic',
  'Plumbing & Water',
  'Electrical & Solar',
  'Repairs & Fundi',
  'Outdoor & Relocation',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

// Pending requests stop being offered to providers this long after they were (re)posted.
export const REQUEST_EXPIRY_MS = 3 * 60 * 60 * 1000;

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Waiting for a pro',
  accepted: 'Pro found – confirm',
  assigned: 'Pro confirmed',
  'in-progress': 'In progress',
  'awaiting-confirmation': 'Awaiting sign-off',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Exact names from the request forms' service catalogue, where keywords alone would misfile them.
const EXACT_CATEGORY: Record<string, ServiceCategory> = {
  'Water Tank Scrubbing & Disinfection': 'Cleaning & Domestic',
  'Solar Water Heater Installation & Repair': 'Plumbing & Water',
  'Instant Shower 7.5kW Wiring & Fitting': 'Electrical & Solar',
  'Appliance Repair (Washing Machine / Fridge)': 'Repairs & Fundi',
  'Car Wash (Home Service Detailing)': 'Cleaning & Domestic',
};

// Checked in order; the first match wins.
const CATEGORY_KEYWORDS: [RegExp, ServiceCategory][] = [
  [/appliance|fridge|washing machine|cooker|oven|gas tech|tv mount|wall bracket/, 'Repairs & Fundi'],
  [/internet|cable|wifi|dstv/, 'Outdoor & Relocation'],
  [/electr|solar|inverter|breaker|wiring|socket|cctv|security/, 'Electrical & Solar'],
  [/plumb|pipe|leak|tap|sink|drain|toilet|water|shower|borehole/, 'Plumbing & Water'],
  [/clean|mama fua|laundry|wash|cook|meal|chef|babysit|nanny|child|domestic|house ?help|ironing/, 'Cleaning & Domestic'],
  [/fundi|handyman|carpent|lock|door|furniture|repair|mason|tile|weld/, 'Repairs & Fundi'],
  [/garden|landscap|lawn|paint|skim|mover|moving|reloc|pest|fumig|errand|concierge|waste|junk|rubbish|garbage|event/, 'Outdoor & Relocation'],
];

/** Maps any service name (catalogue item, quick-pick label, AI free text, legacy value) to a category. */
export function getServiceCategory(serviceName: string | undefined | null): ServiceCategory {
  const name = (serviceName || '').trim();
  if ((SERVICE_CATEGORIES as readonly string[]).includes(name)) return name as ServiceCategory;
  if (EXACT_CATEGORY[name]) return EXACT_CATEGORY[name];
  const lower = name.toLowerCase();
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(lower)) return category;
  }
  // Unrecognised requests go to general handymen rather than being invisible to everyone.
  return 'Repairs & Fundi';
}

/** Converts a provider's saved services (possibly legacy service names) to unique categories. */
export function normalizeProviderCategories(services: string[] | undefined | null): ServiceCategory[] {
  return Array.from(new Set((services || []).map(getServiceCategory)));
}

export function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function isRequestExpired(request: { status?: string; postedAt?: any; createdAt?: any }, now = Date.now()): boolean {
  if (request.status !== 'pending') return false;
  const posted = toDate(request.postedAt) || toDate(request.createdAt);
  // A missing timestamp means the server write hasn't landed yet: treat as fresh.
  if (!posted) return false;
  return now - posted.getTime() > REQUEST_EXPIRY_MS;
}

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
