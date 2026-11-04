import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Heart,
  History,
  Layers,
  MessageSquare,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Period, formatDuration, formatPercent, makePeriod } from '../lib/adminMetrics';
import {
  DeviceType,
  ForumPost,
  SiteEvent,
  communitySummary,
  normalizeEvent,
  normalizeForumPost,
  siteSummary,
} from '../lib/siteAnalytics';

type RangeKey = 'today' | '7d' | '30d';
const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];
/** Firestore refuses queries with a limit above 10,000. */
const MAX_EVENTS = 10000;

/** Visits are counted by Cloudflare Web Analytics now (src/lib/webAnalytics.ts). */
const CLOUDFLARE_WEB_ANALYTICS_URL = 'https://dash.cloudflare.com/?to=/:account/web-analytics';

const INK = '#2D3142';
const GOLD = '#B59D7A';
const AXIS_TICK = { fontSize: 11, fill: '#6B7280' };
const GRID = '#ECEDEF';

const DEVICE_META: Record<DeviceType, { label: string; icon: typeof Monitor }> = {
  mobile: { label: 'Phone', icon: Smartphone },
  desktop: { label: 'Computer', icon: Monitor },
  tablet: { label: 'Tablet', icon: Tablet },
};

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-warm-gray/60 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm min-w-0 ${className}`}>{children}</div>;
}

function Title({ icon: Icon, title, subtitle }: { icon: typeof Monitor; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm md:text-base font-bold text-rich-black flex items-center gap-2">
        <Icon size={16} className="text-accent-gold" /> {title}
      </h2>
      {subtitle && <p className="text-xs text-rich-black/50 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Tile({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: typeof Monitor; hint?: ReactNode; key?: string }) {
  return (
    <div className="bg-white border border-warm-gray/60 rounded-2xl p-4 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-rich-black/55 leading-tight">{label}</p>
        <span className="p-1.5 rounded-lg shrink-0 text-rich-black/60 bg-primary-bg">
          <Icon size={14} />
        </span>
      </div>
      <p className="text-2xl font-black text-rich-black mt-1.5 tabular-nums truncate">{value}</p>
      {hint && <div className="mt-1 text-[11px] text-rich-black/50">{hint}</div>}
    </div>
  );
}

function RankList({ items, empty, unit }: { items: { label: string; count: number; visitors: number }[]; empty: string; unit: string }) {
  if (!items.length) return <p className="py-6 text-center text-xs text-rich-black/45">{empty}</p>;
  const max = items[0].count || 1;
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-rich-black truncate">{it.label}</span>
            <span className="tabular-nums text-rich-black/70 shrink-0">
              {it.count.toLocaleString()} <span className="text-[11px] text-rich-black/40">{unit}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-primary-bg overflow-hidden">
            <div className="h-full rounded-full bg-accent-gold" style={{ width: `${(it.count / max) * 100}%` }} />
          </div>
          <p className="text-[11px] text-rich-black/45 mt-0.5">{it.visitors.toLocaleString()} visitor{it.visitors === 1 ? '' : 's'}</p>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>('7d');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Old visit events, loaded only when asked (up to 10,000 reads each time).
  const [history, setHistory] = useState<SiteEvent[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Forum comments (the community), live.
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'forum'), orderBy('timestamp', 'desc'), limit(500)),
        (snap) => setPosts(snap.docs.map((d) => normalizeForumPost(d.id, d.data()))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'forum'),
      ),
    [],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const snap = await getDocs(query(collection(db, 'analytics'), orderBy('timestamp', 'desc'), limit(MAX_EVENTS)));
      setHistory(snap.docs.map((d) => normalizeEvent(d.id, d.data())));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'analytics');
      setHistoryError(`Could not load visit history: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const period = useMemo(() => makePeriod(range, new Date(now)), [range, now]);
  const community = useMemo(() => communitySummary(posts, period), [posts, period]);

  // The whole recorded history, from the first event to the last.
  const historyPeriod = useMemo<Period | null>(() => {
    const times = (history || []).map((e) => e.timestamp?.getTime() || 0).filter(Boolean);
    return times.length ? { key: 'all', start: new Date(Math.min(...times)), end: new Date(Math.max(...times)) } : null;
  }, [history]);
  const site = useMemo(() => (history && historyPeriod ? siteSummary(history, historyPeriod) : null), [history, historyPeriod]);
  const truncated = (history?.length || 0) >= MAX_EVENTS;
  const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] pt-6 md:pt-10 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="p-2.5 bg-white border border-warm-gray rounded-xl hover:border-rich-black/40"
            aria-label="Back to dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-rich-black tracking-tight">System Analytics</h1>
            <p className="text-xs text-rich-black/50 mt-0.5">Community activity · visits to task-molly.com are counted in Cloudflare</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Visits: Cloudflare */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <Title icon={Globe} title="Visits to task-molly.com" subtitle="Counted by Cloudflare Web Analytics: visitors, page views, pages, where visits come from, countries, devices and page speed." />
                <p className="text-xs text-rich-black/50 -mt-2">Sign in with the Cloudflare account that hosts this admin site. No cookies are used.</p>
              </div>
              <a
                href={CLOUDFLARE_WEB_ANALYTICS_URL}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-rich-black text-white rounded-xl text-xs font-semibold hover:opacity-90"
              >
                Open visits in Cloudflare <ExternalLink size={14} />
              </a>
            </div>
          </Card>

          {/* Community: live from the forum */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Title icon={MessageSquare} title="Community" subtitle="Forum comments in this period" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="bg-white border border-warm-gray rounded-xl px-3 py-2 text-xs font-semibold text-rich-black"
                aria-label="Period"
              >
                {RANGES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="grid grid-cols-3 gap-2 content-start">
                {[
                  { label: 'Comments', value: community.posts },
                  { label: 'People', value: community.participants },
                  { label: 'Likes', value: community.likes },
                ].map((s) => (
                  <div key={s.label} className="bg-primary-bg rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-rich-black tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-rich-black/50">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-2 min-w-0">
                <p className="text-xs font-bold text-rich-black mb-2">Most liked</p>
                {community.mostLiked.length ? (
                  <ul className="space-y-3">
                    {community.mostLiked.map((p) => (
                      <li key={p.id} className="text-xs">
                        <p className="text-rich-black/80 line-clamp-2">"{p.content}"</p>
                        <p className="text-rich-black/45 mt-0.5 flex items-center gap-1">
                          {p.userName} · <Heart size={11} className="text-red-500" /> {p.likes}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-rich-black/45">No liked comments in this period.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Visit history: read-only, what was recorded before Cloudflare */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <Title
                icon={History}
                title="Visit history (read-only)"
                subtitle={
                  historyPeriod
                    ? `Recorded on this site from ${day(historyPeriod.start)} to ${day(historyPeriod.end)}, before visits moved to Cloudflare.`
                    : 'Visits recorded on this site before they moved to Cloudflare. Nothing new is added.'
                }
              />
              {!history && (
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="shrink-0 px-5 py-3 bg-white border border-warm-gray rounded-xl text-xs font-semibold text-rich-black hover:border-rich-black/40 disabled:opacity-50"
                >
                  {historyLoading ? 'Loading…' : 'Load history'}
                </button>
              )}
            </div>

            {historyError && <div className="mt-2 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">{historyError}</div>}
            {!history && !historyError && (
              <p className="text-xs text-rich-black/45">Loads up to {MAX_EVENTS.toLocaleString()} records from the database, so it only loads when you ask.</p>
            )}
            {history && !site && <p className="py-6 text-center text-xs text-rich-black/45">No visits were recorded.</p>}
            {truncated && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs">
                Showing the latest {MAX_EVENTS.toLocaleString()} events only, so the earliest days are undercounted.
              </div>
            )}

            {site && (
              <div className="space-y-6 mt-2">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Tile label="Visitors" value={site.visitors.toLocaleString()} icon={Users} />
                  <Tile label="Visits (sessions)" value={site.sessions.toLocaleString()} icon={Globe} />
                  <Tile
                    label="Pages viewed"
                    value={site.pageViews.toLocaleString()}
                    icon={Eye}
                    hint={site.pagesPerSession === null ? undefined : `${site.pagesPerSession.toFixed(1)} pages per visit`}
                  />
                  <Tile
                    label="Average time per visit"
                    value={site.avgSessionMs === null ? '—' : formatDuration(site.avgSessionMs)}
                    icon={Clock}
                    hint={site.bounceRate === null ? undefined : `${formatPercent(site.bounceRate)} left within 10 s`}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 min-w-0">
                    <Title icon={Activity} title="Traffic" subtitle="Visitors and pages viewed" />
                    <div className="h-[240px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={site.trend} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid stroke={GRID} vertical={false} />
                          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
                          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5DDD1', fontSize: 12 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="visitors" name="Visitors" stroke={INK} strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="pageViews" name="Pages viewed" stroke={GOLD} strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Title icon={Smartphone} title="Devices" subtitle="Share of visits" />
                    <ul className="space-y-4">
                      {site.devices.map((d) => {
                        const meta = DEVICE_META[d.device];
                        return (
                          <li key={d.device}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 font-semibold text-rich-black">
                                <meta.icon size={15} className="text-rich-black/50" /> {meta.label}
                              </span>
                              <span className="tabular-nums text-rich-black/70">
                                {site.sessions ? formatPercent(d.share) : '—'}{' '}
                                <span className="text-[11px] text-rich-black/40">({d.sessions})</span>
                              </span>
                            </div>
                            <div className="mt-1.5 h-2 rounded-full bg-primary-bg overflow-hidden">
                              <div className="h-full rounded-full bg-rich-black" style={{ width: `${d.share * 100}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-6 pt-5 border-t border-warm-gray/60">
                      <p className="text-xs font-bold text-rich-black mb-3">Where visits came from</p>
                      <ul className="space-y-1.5 text-sm">
                        {site.sources.map((s) => (
                          <li key={s.source} className="flex justify-between gap-3">
                            <span className="truncate text-rich-black/80">{s.source === 'direct' ? 'Direct / app' : s.source}</span>
                            <span className="tabular-nums text-rich-black/60">{s.sessions}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="min-w-0">
                    <Title icon={Layers} title="Most viewed pages" />
                    <RankList items={site.topPages} empty="No page views." unit="views" />
                  </div>
                  <div className="min-w-0">
                    <Title icon={FileText} title="Most read articles" subtitle="Blog articles opened" />
                    <RankList items={site.topArticles} empty="No articles opened." unit="reads" />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
