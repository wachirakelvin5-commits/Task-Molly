/**
 * Pure request model: statuses, categories, expiry and date helpers.
 * No Firebase imports, so this can be used from unit tests and server code.
 */

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
  [/clean|mama fua|laundry|wash|cook|meal|chef|babysit|nanny|child|domestic|house ?help|ironing|helper|elder|care\b|caregiver|dog|\bpets?\b|walking/, 'Cleaning & Domestic'],
  [/fundi|handyman|carpent|lock|\bdoor|furniture|repair|mason|tile|weld/, 'Repairs & Fundi'],
  [/outdoor|garden|landscap|lawn|paint|skim|mover|moving|reloc|pest|fumig|errand|concierge|waste|junk|rubbish|garbage|event|pool/, 'Outdoor & Relocation'],
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

// ---- Prices ----
// The provider sets the job price when they accept a request (stored as clientPrice: what the
// client pays the provider). Task Molly's platform fee is a share of that price, paid by the provider.

/** Task Molly's platform fee: this share of the job price, paid by the provider (VAT on top). */
export const PROVIDER_FEE_RATE = 0.15;
/** Highest price a provider can quote for one job. */
export const MAX_QUOTE_KES = 1_000_000;

/** True for a whole-shilling price a provider is allowed to quote. */
export function isValidQuote(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_QUOTE_KES;
}

/** The price the provider quoted, once a provider has taken the request; null while it is open. */
export function quotedPrice(request: { providerId?: string; clientPrice?: unknown }): number | null {
  const price = Number(request.clientPrice);
  return request.providerId && price > 0 ? price : null;
}

/** What the provider keeps from a job price after Task Molly's platform fee. */
export function takeHomeFor(price: number): number {
  return Math.round(price * (1 - PROVIDER_FEE_RATE));
}

/** What the provider keeps from this request, or null while it has no quoted price. */
export function providerTakeHome(request: { providerId?: string; clientPrice?: unknown; providerPrice?: unknown }): number | null {
  const price = quotedPrice(request);
  if (price === null) return null;
  // Requests accepted before providers set their own price stored the payout explicitly.
  const explicit = Number(request.providerPrice);
  return explicit > 0 ? explicit : takeHomeFor(price);
}
