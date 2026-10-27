/**
 * Site analytics numbers for the admin screen, from the events written by src/lib/analytics.ts.
 * Pure functions (no Firestore), unit-tested in tests/siteAnalytics.test.ts.
 */
import { Period, inPeriod } from './adminMetrics';
import { toDate } from './requestModel';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface SiteEvent {
  id: string;
  type: 'page_view' | 'page_exit' | 'blog_view' | string;
  page: string;
  sessionId: string;
  visitorId: string;
  device: DeviceType;
  newSession: boolean;
  referrer: string | null;
  title: string | null;
  durationMs: number;
  timestamp: Date | null;
}

export function normalizeEvent(id: string, data: Record<string, any>): SiteEvent {
  const device = ['mobile', 'tablet', 'desktop'].includes(data.device) ? data.device : 'desktop';
  return {
    id,
    type: String(data.type || ''),
    page: String(data.page || '/'),
    sessionId: String(data.sessionId || id),
    visitorId: String(data.visitorId || data.sessionId || id),
    device,
    newSession: data.newSession === true,
    referrer: typeof data.referrer === 'string' ? data.referrer : null,
    title: typeof data.title === 'string' ? data.title : null,
    durationMs: typeof data.durationMs === 'number' && data.durationMs > 0 ? data.durationMs : 0,
    timestamp: toDate(data.timestamp),
  };
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/request': 'Request a service',
  '/auth': 'Sign in / sign up',
  '/dashboard': 'Client dashboard',
  '/tasks': 'My tasks (client)',
  '/provider-dashboard': 'Provider dashboard',
  '/provider-services': 'Provider jobs',
  '/providers': 'Find a pro',
  '/chat': 'Chat',
  '/blog': 'Blog page',
};

/** A readable name for a tracked page ("/#Blog" -> "Home › Blog"). */
export function pageLabel(page: string): string {
  if (PAGE_LABELS[page]) return PAGE_LABELS[page];
  if (page.startsWith('/#')) return `Home › ${page.slice(2)}`;
  return page;
}

/** A session that saw one page and stayed under this long counts as a bounce. */
export const BOUNCE_MS = 10 * 1000;

export interface RankedItem {
  label: string;
  count: number;
  visitors: number;
}

export interface SiteSummary {
  sessions: number;
  visitors: number;
  pageViews: number;
  pagesPerSession: number | null;
  /** Average visible time per session. */
  avgSessionMs: number | null;
  bounceRate: number | null;
  devices: { device: DeviceType; sessions: number; share: number }[];
  topPages: RankedItem[];
  topArticles: RankedItem[];
  sources: { source: string; sessions: number }[];
  trend: { label: string; visitors: number; pageViews: number }[];
}

function rank(events: SiteEvent[], key: (e: SiteEvent) => string, top: number): RankedItem[] {
  const map = new Map<string, { count: number; visitors: Set<string> }>();
  for (const e of events) {
    const k = key(e);
    const item = map.get(k) || { count: 0, visitors: new Set<string>() };
    item.count += 1;
    item.visitors.add(e.visitorId);
    map.set(k, item);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, count: v.count, visitors: v.visitors.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, top);
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Hourly buckets for "today", daily buckets otherwise. */
function trendBuckets(p: Period, events: SiteEvent[]) {
  const hourly = p.key === 'today';
  const end = p.end;
  let start = p.start;
  if (!start) {
    const first = events.reduce<number | null>((m, e) => (e.timestamp ? Math.min(m ?? Infinity, e.timestamp.getTime()) : m), null);
    start = new Date(first ?? end.getTime());
  }
  const buckets: { key: string; label: string }[] = [];
  const keyOf = (d: Date) =>
    hourly ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hourly ? start.getHours() : 0);
  // Today: show the whole day (00:00-23:00) so the chart doesn't grow through the day.
  const last = hourly ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23) : end;
  while (cursor.getTime() <= last.getTime() && buckets.length < 400) {
    buckets.push({
      key: keyOf(cursor),
      label: hourly ? `${pad(cursor.getHours())}:00` : `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}`,
    });
    if (hourly) cursor.setHours(cursor.getHours() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  return { buckets, keyOf };
}

export function siteSummary(all: SiteEvent[], p: Period): SiteSummary {
  const events = all.filter((e) => inPeriod(e.timestamp, p));
  const views = events.filter((e) => e.type === 'page_view');

  // Per-session facts
  const sessions = new Map<string, { device: DeviceType; views: number; ms: number; source: string | null }>();
  for (const e of events) {
    const s = sessions.get(e.sessionId) || { device: e.device, views: 0, ms: 0, source: null };
    if (e.type === 'page_view') s.views += 1;
    if (e.type === 'page_exit') s.ms += e.durationMs;
    if (e.newSession && e.referrer) s.source = e.referrer;
    sessions.set(e.sessionId, s);
  }
  const sessionList = [...sessions.values()];
  const count = sessionList.length;
  const totalMs = sessionList.reduce((t, s) => t + s.ms, 0);
  const bounces = sessionList.filter((s) => s.views <= 1 && s.ms < BOUNCE_MS).length;

  const deviceCounts = (['mobile', 'desktop', 'tablet'] as DeviceType[]).map((device) => ({
    device,
    sessions: sessionList.filter((s) => s.device === device).length,
  }));

  const sourceCounts = new Map<string, number>();
  for (const s of sessionList) {
    const src = s.source || 'direct';
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }

  const { buckets, keyOf } = trendBuckets(p, events);
  const trendMap = new Map(buckets.map((b) => [b.key, { visitors: new Set<string>(), pageViews: 0 }]));
  for (const e of events) {
    const b = e.timestamp && trendMap.get(keyOf(e.timestamp));
    if (!b) continue;
    b.visitors.add(e.visitorId);
    if (e.type === 'page_view') b.pageViews += 1;
  }

  return {
    sessions: count,
    visitors: new Set(events.map((e) => e.visitorId)).size,
    pageViews: views.length,
    pagesPerSession: count ? views.length / count : null,
    avgSessionMs: count ? totalMs / count : null,
    bounceRate: count ? bounces / count : null,
    devices: deviceCounts.map((d) => ({ ...d, share: count ? d.sessions / count : 0 })),
    topPages: rank(views, (e) => pageLabel(e.page), 6),
    topArticles: rank(events.filter((e) => e.type === 'blog_view'), (e) => e.title || e.page, 5),
    sources: [...sourceCounts.entries()]
      .map(([source, sessions]) => ({ source, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5),
    trend: buckets.map((b) => ({ label: b.label, visitors: trendMap.get(b.key)!.visitors.size, pageViews: trendMap.get(b.key)!.pageViews })),
  };
}

/** Visitors with any activity in the last 5 minutes. */
export function activeNow(events: SiteEvent[], now = Date.now()): number {
  const since = now - 5 * 60 * 1000;
  return new Set(events.filter((e) => e.timestamp && e.timestamp.getTime() >= since).map((e) => e.visitorId)).size;
}

// ---------------------------------------------------------------------------
// Community (forum comments)
// ---------------------------------------------------------------------------

export interface ForumPost {
  id: string;
  userId: string;
  userName: string;
  content: string;
  likes: number;
  isReply: boolean;
  timestamp: Date | null;
}

export function normalizeForumPost(id: string, data: Record<string, any>): ForumPost {
  return {
    id,
    userId: String(data.userId || ''),
    userName: String(data.userName || 'Guest'),
    content: String(data.content || ''),
    likes: typeof data.likes === 'number' && data.likes > 0 ? data.likes : 0,
    isReply: !!data.replyToId,
    timestamp: toDate(data.timestamp),
  };
}

export interface CommunitySummary {
  posts: number;
  replies: number;
  participants: number;
  likes: number;
  mostLiked: ForumPost[];
}

export function communitySummary(all: ForumPost[], p: Period): CommunitySummary {
  const posts = all.filter((x) => inPeriod(x.timestamp, p));
  return {
    posts: posts.length,
    replies: posts.filter((x) => x.isReply).length,
    participants: new Set(posts.map((x) => x.userId)).size,
    likes: posts.reduce((t, x) => t + x.likes, 0),
    mostLiked: [...posts].filter((x) => x.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 3),
  };
}
