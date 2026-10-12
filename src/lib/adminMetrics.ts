/**
 * Admin dashboard metrics.
 *
 * Pure functions: they take the raw serviceRequests documents and return the numbers the
 * admin screens show. Nothing here reads from Firestore, so it can be unit-tested
 * (tests/adminMetrics.test.ts) and later reused by a Cloud Function that pre-computes totals.
 *
 * Money note: payments are not processed yet, so every "value" here is the agreed price on
 * the request (clientPrice), not money actually collected.
 */
import {
  REQUEST_EXPIRY_MS,
  RequestStatus,
  SERVICE_CATEGORIES,
  ServiceCategory,
  getServiceCategory,
  toDate,
} from './requestModel';

// Small date helpers (local time). Kept dependency-free so this module runs anywhere.
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}
function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
/** Monday-based week start. */
function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() + 6) % 7));
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}
const pad = (n: number) => String(n).padStart(2, '0');
const dayLabel = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const formatDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;


/** Pending requests this close to expiring are flagged on the live screen. */
export const EXPIRING_SOON_MS = 30 * 60 * 1000;

/** Task Molly's share of the agreed price when a request has no explicit providerPrice. */
export const COMMISSION_RATE = 0.15;

export type LiveStage =
  | 'open'
  | 'expiring'
  | 'expired'
  | 'accepted'
  | 'assigned'
  | 'in-progress'
  | 'awaiting-confirmation'
  | 'issue'
  | 'completed'
  | 'cancelled';

export const ACTIVE_STAGES: LiveStage[] = [
  'expired',
  'expiring',
  'open',
  'accepted',
  'assigned',
  'in-progress',
  'awaiting-confirmation',
  'issue',
];

export const STAGE_LABELS: Record<LiveStage, string> = {
  open: 'Open, no pro yet',
  expiring: 'Expiring soon',
  expired: 'Expired, nobody accepted',
  accepted: 'Awaiting client confirmation',
  assigned: 'Pro confirmed, not started',
  'in-progress': 'In progress',
  'awaiting-confirmation': 'Awaiting client sign-off',
  issue: 'Issue reported',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface AdminRequest {
  id: string;
  status: RequestStatus;
  serviceType: string;
  category: ServiceCategory;
  clientId: string;
  clientName: string;
  providerId: string | null;
  providerName: string | null;
  location: string;
  /** Agreed price the client pays (KES). */
  price: number;
  /** What the provider receives (KES). */
  payout: number;
  /** Task Molly's share (KES). */
  commission: number;
  createdAt: Date | null;
  postedAt: Date | null;
  acceptedAt: Date | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  providerCompletedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  issueReportedAt: Date | null;
}

const STATUSES: RequestStatus[] = [
  'pending',
  'accepted',
  'assigned',
  'in-progress',
  'awaiting-confirmation',
  'completed',
  'cancelled',
];

function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Converts a raw Firestore document into the shape the dashboard works with. */
export function normalizeRequest(id: string, data: Record<string, any>): AdminRequest {
  const price = num(data.clientPrice) || num(data.budget);
  const explicitPayout = num(data.providerPrice);
  const payout = explicitPayout > 0 ? Math.min(explicitPayout, price || explicitPayout) : Math.round(price * (1 - COMMISSION_RATE));
  const status = STATUSES.includes(data.status) ? (data.status as RequestStatus) : 'pending';
  const category = (SERVICE_CATEGORIES as readonly string[]).includes(data.serviceCategory)
    ? (data.serviceCategory as ServiceCategory)
    : getServiceCategory(data.serviceType);

  return {
    id,
    status,
    serviceType: data.serviceType || 'Unknown service',
    category,
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    providerId: data.providerId || null,
    providerName: data.providerName || null,
    location: data.location || '',
    price,
    payout,
    commission: Math.max(0, price - payout),
    createdAt: toDate(data.createdAt),
    postedAt: toDate(data.postedAt) || toDate(data.createdAt),
    acceptedAt: toDate(data.acceptedAt),
    confirmedAt: toDate(data.confirmedAt),
    startedAt: toDate(data.startedAt),
    providerCompletedAt: toDate(data.providerCompletedAt),
    completedAt: toDate(data.completedAt),
    cancelledAt: toDate(data.cancelledAt),
    issueReportedAt: toDate(data.issueReportedAt),
  };
}

/** When an open request stops being offered to providers. */
export function expiresAt(r: AdminRequest): Date | null {
  return r.status === 'pending' && r.postedAt ? new Date(r.postedAt.getTime() + REQUEST_EXPIRY_MS) : null;
}

export function getStage(r: AdminRequest, now = Date.now()): LiveStage {
  if (r.status === 'pending') {
    const expiry = expiresAt(r);
    if (!expiry) return 'open';
    const left = expiry.getTime() - now;
    if (left <= 0) return 'expired';
    if (left <= EXPIRING_SOON_MS) return 'expiring';
    return 'open';
  }
  if (r.status === 'awaiting-confirmation' && r.issueReportedAt) return 'issue';
  return r.status;
}

/** The moment the request entered its current stage: what "waiting since" means on the live screen. */
export function stageSince(r: AdminRequest, now = Date.now()): Date | null {
  switch (getStage(r, now)) {
    case 'open':
    case 'expiring':
      return r.postedAt;
    case 'expired':
      return expiresAt(r);
    case 'accepted':
      return r.acceptedAt;
    case 'assigned':
      return r.confirmedAt || r.acceptedAt;
    case 'in-progress':
      return r.startedAt;
    case 'awaiting-confirmation':
      return r.providerCompletedAt;
    case 'issue':
      return r.issueReportedAt;
    case 'completed':
      return r.completedAt;
    case 'cancelled':
      return r.cancelledAt;
  }
}

// ---------------------------------------------------------------------------
// Live operations
// ---------------------------------------------------------------------------

export interface LiveRow extends AdminRequest {
  stage: LiveStage;
  since: Date | null;
  /** Milliseconds spent in the current stage. */
  waitingMs: number;
  expiresAt: Date | null;
}

export interface LiveSummary {
  counts: Record<LiveStage, number>;
  activeTotal: number;
  /** Agreed value of confirmed jobs not yet signed off (KES). */
  valueInFlight: number;
  rows: LiveRow[];
  oldestOpenMs: number | null;
}

/** Stage order used to sort the live table: things needing the admin first. */
const STAGE_PRIORITY: Record<LiveStage, number> = {
  issue: 0,
  expired: 1,
  expiring: 2,
  open: 3,
  accepted: 4,
  'awaiting-confirmation': 5,
  assigned: 6,
  'in-progress': 7,
  completed: 8,
  cancelled: 9,
};

export function liveSummary(requests: AdminRequest[], now = Date.now()): LiveSummary {
  const counts = Object.fromEntries(
    (Object.keys(STAGE_LABELS) as LiveStage[]).map((s) => [s, 0])
  ) as Record<LiveStage, number>;

  const rows: LiveRow[] = [];
  let valueInFlight = 0;
  let oldestOpenMs: number | null = null;

  for (const r of requests) {
    const stage = getStage(r, now);
    counts[stage] += 1;
    if (!ACTIVE_STAGES.includes(stage)) continue;

    const since = stageSince(r, now);
    const waitingMs = since ? Math.max(0, now - since.getTime()) : 0;
    rows.push({ ...r, stage, since, waitingMs, expiresAt: expiresAt(r) });

    if (['assigned', 'in-progress', 'awaiting-confirmation', 'issue'].includes(stage)) valueInFlight += r.price;
    if ((stage === 'open' || stage === 'expiring') && r.postedAt) {
      const age = now - r.postedAt.getTime();
      oldestOpenMs = oldestOpenMs === null ? age : Math.max(oldestOpenMs, age);
    }
  }

  rows.sort((a, b) => STAGE_PRIORITY[a.stage] - STAGE_PRIORITY[b.stage] || b.waitingMs - a.waitingMs);

  return { counts, activeTotal: rows.length, valueInFlight, rows, oldestOpenMs };
}

// ---------------------------------------------------------------------------
// Periods and time buckets
// ---------------------------------------------------------------------------

export type PeriodKey = 'today' | '7d' | '30d' | '90d' | 'all';

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

export interface Period {
  key: PeriodKey;
  start: Date | null;
  end: Date;
}

export function makePeriod(key: PeriodKey, now = new Date()): Period {
  const today = startOfDay(now);
  const start =
    key === 'today' ? today :
    key === '7d' ? addDays(today, -6) :
    key === '30d' ? addDays(today, -29) :
    key === '90d' ? addDays(today, -89) :
    null;
  return { key, start, end: now };
}

/** The period of the same length immediately before `p` (for "vs previous" comparisons). */
export function previousPeriod(p: Period): Period | null {
  if (!p.start) return null;
  const lengthMs = p.end.getTime() - p.start.getTime();
  return { key: p.key, start: new Date(p.start.getTime() - lengthMs), end: p.start };
}

export function inPeriod(date: Date | null, p: Period): boolean {
  if (!date) return false;
  const t = date.getTime();
  return (!p.start || t >= p.start.getTime()) && t <= p.end.getTime();
}

type Granularity = 'day' | 'week' | 'month';

interface Bucket {
  key: string;
  label: string;
  start: Date;
}

function bucketStart(date: Date, g: Granularity): Date {
  return g === 'day' ? startOfDay(date) : g === 'week' ? startOfWeek(date) : startOfMonth(date);
}

/** Builds evenly spaced buckets covering the period (or the data's span for "all time"). */
function buildBuckets(p: Period, dates: Date[]): { granularity: Granularity; buckets: Bucket[] } {
  const earliest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : p.end;
  const start = p.start || earliest;
  const spanDays = calendarDaysBetween(start, p.end) + 1;
  const granularity: Granularity = spanDays <= 31 ? 'day' : spanDays <= 180 ? 'week' : 'month';
  const step = granularity === 'day' ? addDays : granularity === 'week' ? addWeeks : addMonths;
  const label = (d: Date) => (granularity === 'day' ? dayLabel(d) : granularity === 'week' ? `Wk of ${dayLabel(d)}` : monthLabel(d));

  const buckets: Bucket[] = [];
  for (let b = bucketStart(start, granularity); b.getTime() <= p.end.getTime(); b = step(b, 1)) {
    buckets.push({ key: b.toISOString(), label: label(b), start: b });
    if (buckets.length > 400) break; // safety net
  }
  return { granularity, buckets };
}

// ---------------------------------------------------------------------------
// Performance (outcomes and speed)
// ---------------------------------------------------------------------------

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function gap(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  const ms = to.getTime() - from.getTime();
  return ms >= 0 ? ms : null;
}

export interface CategoryOutcome {
  category: ServiceCategory;
  completed: number;
  cancelled: number;
  expired: number;
  posted: number;
  completionRate: number | null;
  medianAcceptMs: number | null;
}

export interface SpeedStat {
  label: string;
  description: string;
  medianMs: number | null;
  samples: number;
}

export interface Performance {
  posted: number;
  completed: number;
  cancelled: number;
  expired: number;
  completionRate: number | null;
  byCategory: CategoryOutcome[];
  speed: SpeedStat[];
  trend: { label: string; completed: number; cancelled: number; expired: number }[];
}

/** A pending request counts as expired at the moment its offer window closed. */
function expiredAt(r: AdminRequest, now: number): Date | null {
  const expiry = expiresAt(r);
  return expiry && expiry.getTime() <= now ? expiry : null;
}

export function performance(requests: AdminRequest[], p: Period): Performance {
  const now = p.end.getTime();
  const completed = requests.filter((r) => r.status === 'completed' && inPeriod(r.completedAt, p));
  const cancelled = requests.filter((r) => r.status === 'cancelled' && inPeriod(r.cancelledAt, p));
  const expired = requests.filter((r) => inPeriod(expiredAt(r, now), p));
  const posted = requests.filter((r) => inPeriod(r.createdAt, p));
  const rate = (c: number, x: number, e: number) => (c + x + e ? c / (c + x + e) : null);

  const acceptGaps = (rs: AdminRequest[]) =>
    rs.filter((r) => inPeriod(r.acceptedAt, p)).map((r) => gap(r.createdAt, r.acceptedAt)).filter((v): v is number => v !== null);

  const byCategory: CategoryOutcome[] = SERVICE_CATEGORIES.map((category) => {
    const c = completed.filter((r) => r.category === category).length;
    const x = cancelled.filter((r) => r.category === category).length;
    const e = expired.filter((r) => r.category === category).length;
    return {
      category,
      completed: c,
      cancelled: x,
      expired: e,
      posted: posted.filter((r) => r.category === category).length,
      completionRate: rate(c, x, e),
      medianAcceptMs: median(acceptGaps(requests.filter((r) => r.category === category))),
    };
  }).sort((a, b) => b.completed - a.completed || (b.completionRate ?? -1) - (a.completionRate ?? -1));

  const speedSamples = (pick: (r: AdminRequest) => [Date | null, Date | null]) =>
    requests
      .map(pick)
      .filter(([, to]) => inPeriod(to, p))
      .map(([from, to]) => gap(from, to))
      .filter((v): v is number => v !== null);

  const speed: SpeedStat[] = [
    { label: 'Time to accept', description: 'Request posted → a pro accepts', values: acceptGaps(requests) },
    { label: 'Time to start', description: 'Pro accepts → work starts', values: speedSamples((r) => [r.acceptedAt, r.startedAt]) },
    { label: 'Time to finish', description: 'Work starts → client signs off', values: speedSamples((r) => [r.startedAt, r.completedAt]) },
    { label: 'Total turnaround', description: 'Request posted → client signs off', values: speedSamples((r) => [r.createdAt, r.completedAt]) },
  ].map(({ label, description, values }) => ({ label, description, medianMs: median(values), samples: values.length }));

  const { buckets, granularity } = buildBuckets(p, [...completed, ...cancelled].map((r) => r.completedAt || r.cancelledAt!).filter(Boolean));
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const trend = buckets.map((b) => ({ label: b.label, completed: 0, cancelled: 0, expired: 0 }));
  const add = (date: Date | null, field: 'completed' | 'cancelled' | 'expired') => {
    if (!date) return;
    const i = index.get(bucketStart(date, granularity).toISOString());
    if (i !== undefined) trend[i][field] += 1;
  };
  completed.forEach((r) => add(r.completedAt, 'completed'));
  cancelled.forEach((r) => add(r.cancelledAt, 'cancelled'));
  expired.forEach((r) => add(expiredAt(r, now), 'expired'));

  return {
    posted: posted.length,
    completed: completed.length,
    cancelled: cancelled.length,
    expired: expired.length,
    completionRate: rate(completed.length, cancelled.length, expired.length),
    byCategory,
    speed,
    trend,
  };
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface CategoryMoney {
  category: ServiceCategory;
  jobs: number;
  gross: number;
  commission: number;
  payouts: number;
  average: number | null;
}

export interface Money {
  jobs: number;
  gross: number;
  commission: number;
  payouts: number;
  average: number | null;
  byCategory: CategoryMoney[];
  trend: { label: string; gross: number; commission: number; jobs: number }[];
}

export function money(requests: AdminRequest[], p: Period): Money {
  const done = requests.filter((r) => r.status === 'completed' && inPeriod(r.completedAt, p));
  const sum = (rs: AdminRequest[], f: (r: AdminRequest) => number) => rs.reduce((s, r) => s + f(r), 0);

  const byCategory: CategoryMoney[] = SERVICE_CATEGORIES.map((category) => {
    const rs = done.filter((r) => r.category === category);
    const gross = sum(rs, (r) => r.price);
    return {
      category,
      jobs: rs.length,
      gross,
      commission: sum(rs, (r) => r.commission),
      payouts: sum(rs, (r) => r.payout),
      average: rs.length ? gross / rs.length : null,
    };
  }).sort((a, b) => b.gross - a.gross || b.jobs - a.jobs);

  const { buckets, granularity } = buildBuckets(p, done.map((r) => r.completedAt!));
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const trend = buckets.map((b) => ({ label: b.label, gross: 0, commission: 0, jobs: 0 }));
  for (const r of done) {
    const i = index.get(bucketStart(r.completedAt!, granularity).toISOString());
    if (i === undefined) continue;
    trend[i].gross += r.price;
    trend[i].commission += r.commission;
    trend[i].jobs += 1;
  }

  const gross = sum(done, (r) => r.price);
  return {
    jobs: done.length,
    gross,
    commission: sum(done, (r) => r.commission),
    payouts: sum(done, (r) => r.payout),
    average: done.length ? gross / done.length : null,
    byCategory,
    trend,
  };
}

// ---------------------------------------------------------------------------
// Formatting and export
// ---------------------------------------------------------------------------

export function formatKES(value: number): string {
  return `KES ${Math.round(value).toLocaleString('en-KE')}`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const minutes = ms / 60000;
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

/** Percentage change from `before` to `after`; null when there is nothing to compare against. */
export function change(after: number, before: number | null | undefined): number | null {
  if (before === null || before === undefined || before === 0) return null;
  return (after - before) / before;
}

const fmtDate = (d: Date | null) => (d ? formatDateTime(d) : '');

/** One flat row per request, for CSV / Excel export. */
export function exportRows(requests: AdminRequest[], now = Date.now()) {
  return requests.map((r) => ({
    'Request ID': r.id,
    Stage: STAGE_LABELS[getStage(r, now)],
    Service: r.serviceType,
    Category: r.category,
    Client: r.clientName || r.clientId,
    Provider: r.providerName || '',
    Location: r.location,
    'Agreed price (KES)': r.price,
    'Provider payout (KES)': r.payout,
    'Commission (KES)': r.commission,
    Posted: fmtDate(r.createdAt),
    Accepted: fmtDate(r.acceptedAt),
    Started: fmtDate(r.startedAt),
    'Signed off': fmtDate(r.completedAt),
    Cancelled: fmtDate(r.cancelledAt),
    'Issue reported': fmtDate(r.issueReportedAt),
  }));
}

export function toCSV(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const cell = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => cell(row[h])).join(','))].join('\n');
}
