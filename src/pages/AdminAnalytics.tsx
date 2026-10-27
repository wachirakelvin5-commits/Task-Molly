import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  Globe,
  Heart,
  Info,
  Layers,
  MessageSquare,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Timestamp, collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { change, formatDuration, formatPercent, makePeriod, previousPeriod } from '../lib/adminMetrics';
import {
  DeviceType,
  ForumPost,
  SiteEvent,
  activeNow,
  communitySummary,
  normalizeEvent,
  normalizeForumPost,
  pageLabel,
  siteSummary,
} from '../lib/siteAnalytics';

type RangeKey = 'today' | '7d' | '30d';
const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];
/** Days of events to load per range (the extra days feed "vs previous period"). */
const LOAD_DAYS: Record<RangeKey, number> = { today: 2, '7d': 14, '30d': 30 };
const MAX_EVENTS = 20000;

const INK = '#2D3142';
const GOLD = '#B59D7A';
const AXIS_TICK = { fontSize: 11, fill: '#6B7280' };
const GRID = '#ECEDEF';

const DEVICE_META: Record<DeviceType, { label: string; icon: typeof Monitor }> = {
  mobile: { label: 'Phone', icon: Smartphone },
  desktop: { label: 'Computer', icon: Monitor },
  tablet: { label: 'Tablet', icon: Tablet },
};

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Opened',
  page_exit: 'Left',
  blog_view: 'Read article',
};

function ago(date: Date | null, now: number): string {
  if (!date) return 'just now';
  const min = Math.floor(Math.max(0, now - date.getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

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

function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null) return <span className="text-[11px] text-rich-black/40">no earlier data</span>;
  const up = value >= 0;
  return (
    <span className={`text-[11px] font-semibold ${value === 0 ? 'text-rich-black/50' : up === goodWhenUp ? 'text-green-700' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}% <span className="font-normal text-rich-black/40">vs previous</span>
    </span>
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
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Visit events for the chosen range (live).
  useEffect(() => {
    setLoading(true);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (LOAD_DAYS[range] - 1));
    const q = query(
      collection(db, 'analytics'),
      where('timestamp', '>=', Timestamp.fromDate(since)),
      orderBy('timestamp', 'desc'),
      limit(MAX_EVENTS),
    );
    return onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => normalizeEvent(d.id, d.data())));
        setError(null);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'analytics');
        setError('Could not load visit data. Make sure you are signed in with the admin account.');
        setLoading(false);
      },
    );
  }, [range]);

  // Forum comments (the community).
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
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const period = useMemo(() => makePeriod(range, new Date(now)), [range, now]);
  const prev = useMemo(() => (range === '30d' ? null : previousPeriod(period)), [range, period]);
  const site = useMemo(() => siteSummary(events, period), [events, period]);
  const sitePrev = useMemo(() => (prev ? siteSummary(events, prev) : null), [events, prev]);
  const community = useMemo(() => communitySummary(posts, period), [posts, period]);
  const live = useMemo(() => activeNow(events, now), [events, now]);
  const feed = useMemo(() => events.filter((e) => e.type !== 'page_exit').slice(0, 15), [events]);

  const hasData = events.length > 0;
  const truncated = events.length >= MAX_EVENTS;

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] pt-6 md:pt-10 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin-dashboard')}
              className="p-2.5 bg-white border border-warm-gray rounded-xl hover:border-rich-black/40"
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-rich-black tracking-tight">System Analytics</h1>
              <p className="text-xs text-rich-black/50 mt-0.5">Visits to task-molly.com and community activity · live</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 bg-white border border-warm-gray rounded-xl px-3 py-2 text-xs font-semibold text-rich-black">
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-rich-black/20'}`} />
              {live} on the site now
            </span>
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
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">{error}</div>}

        {!loading && !hasData && !error && (
          <div className="mb-6 flex items-start gap-3 bg-white border border-warm-gray/60 rounded-2xl p-4 text-sm text-rich-black/70">
            <Info size={18} className="shrink-0 mt-0.5 text-accent-gold" />
            <span>
              No visits recorded for this period yet. Visits are counted from the moment this update is live on
              task-molly.com. Your own visits to the admin site aren't counted.
            </span>
          </div>
        )}
        {truncated && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs">
            Showing the latest {MAX_EVENTS.toLocaleString()} events only, so older days in this period are undercounted.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile
                label="Visitors"
                value={site.visitors.toLocaleString()}
                icon={Users}
                hint={<Delta value={change(site.visitors, sitePrev?.visitors)} />}
              />
              <Tile
                label="Visits (sessions)"
                value={site.sessions.toLocaleString()}
                icon={Globe}
                hint={<Delta value={change(site.sessions, sitePrev?.sessions)} />}
              />
              <Tile
                label="Pages viewed"
                value={site.pageViews.toLocaleString()}
                icon={Eye}
                hint={site.pagesPerSession === null ? 'No visits yet' : `${site.pagesPerSession.toFixed(1)} pages per visit`}
              />
              <Tile
                label="Average time per visit"
                value={site.avgSessionMs === null ? '—' : formatDuration(site.avgSessionMs)}
                icon={Clock}
                hint={site.bounceRate === null ? 'No visits yet' : `${formatPercent(site.bounceRate)} left within 10 s`}
              />
            </div>

            {/* Traffic chart + devices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <Title
                  icon={Activity}
                  title="Traffic"
                  subtitle={range === 'today' ? 'Visitors and pages viewed per hour today' : 'Visitors and pages viewed per day'}
                />
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
              </Card>

              <Card>
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
                  <p className="text-xs font-bold text-rich-black mb-3">Where visits come from</p>
                  {site.sources.length ? (
                    <ul className="space-y-1.5 text-sm">
                      {site.sources.map((s) => (
                        <li key={s.source} className="flex justify-between gap-3">
                          <span className="truncate text-rich-black/80">{s.source === 'direct' ? 'Direct / app' : s.source}</span>
                          <span className="tabular-nums text-rich-black/60">{s.sessions}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-rich-black/45">No visits yet.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Pages, articles, community */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <Title icon={Layers} title="Most viewed pages" />
                <RankList items={site.topPages} empty="No page views yet." unit="views" />
              </Card>

              <Card>
                <Title icon={FileText} title="Most read articles" subtitle="Blog articles opened" />
                <RankList items={site.topArticles} empty="No articles opened yet." unit="reads" />
              </Card>

              <Card>
                <Title icon={MessageSquare} title="Community" subtitle="Forum comments in this period" />
                <div className="grid grid-cols-3 gap-2 mb-5">
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
              </Card>
            </div>

            {/* Live feed */}
            <Card>
              <Title icon={Activity} title="Latest activity" subtitle="Anonymous: visitors are random ids, no names or contact details" />
              {feed.length ? (
                <ul className="divide-y divide-warm-gray/50">
                  {feed.map((e) => {
                    const Icon = DEVICE_META[e.device].icon;
                    return (
                      <li key={e.id} className="py-2.5 flex items-center gap-3 text-sm">
                        <Icon size={15} className="text-rich-black/40 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="text-rich-black/50">{EVENT_LABELS[e.type] || e.type}</span>{' '}
                          <span className="font-semibold text-rich-black">{e.type === 'blog_view' ? e.title : pageLabel(e.page)}</span>
                          {e.newSession && e.referrer && e.referrer !== 'direct' && (
                            <span className="text-rich-black/40"> · from {e.referrer}</span>
                          )}
                        </span>
                        <span className="text-[11px] text-rich-black/45 shrink-0">{ago(e.timestamp, now)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-6 text-center text-xs text-rich-black/45">Waiting for the first visit…</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
