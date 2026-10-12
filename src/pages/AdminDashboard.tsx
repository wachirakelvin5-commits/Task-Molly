import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Hourglass,
  Info,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  UserX,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, deleteField, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ACTIVE_STAGES,
  AdminRequest,
  LiveRow,
  LiveStage,
  PERIOD_LABELS,
  PeriodKey,
  STAGE_LABELS,
  change,
  exportRows,
  formatDateTime,
  formatDuration,
  formatKES,
  formatPercent,
  inPeriod,
  liveSummary,
  makePeriod,
  money,
  normalizeRequest,
  performance,
  previousPeriod,
  toCSV,
} from '../lib/adminMetrics';
import { SERVICE_CATEGORIES, toDate } from '../lib/requestModel';

type Tab = 'live' | 'performance' | 'money';

const TABS: { id: Tab; label: string }[] = [
  { id: 'live', label: 'Live operations' },
  { id: 'performance', label: 'Performance' },
  { id: 'money', label: 'Money' },
];

// Chart colours (validated for colour-blind separation and contrast on white).
const INK = '#2D3142';
const OUTCOME_COLORS = { completed: '#0F9D6E', cancelled: '#7C6FD6', expired: '#D97706' };
const AXIS_TICK = { fontSize: 11, fill: '#6B7280' };
const GRID = '#ECEDEF';

/** Visual treatment per live stage: needs-action stages are red/amber, the rest neutral. */
const STAGE_STYLE: Record<LiveStage, { badge: string; icon: typeof Activity; urgent?: boolean }> = {
  issue: { badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle, urgent: true },
  expired: { badge: 'bg-red-50 text-red-700 border-red-200', icon: UserX, urgent: true },
  expiring: { badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: Hourglass, urgent: true },
  open: { badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: Search },
  accepted: { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  assigned: { badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: ShieldCheck },
  'in-progress': { badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: Wrench },
  'awaiting-confirmation': { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  completed: { badge: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelled: { badge: 'bg-slate-100 text-slate-500 border-slate-200', icon: Ban },
};

interface Complaint {
  id: string;
  taskId?: string;
  reason?: string;
  reporterRole?: string;
  timestamp: Date | null;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-warm-gray/60 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm ${className}`}>{children}</div>;
}

function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-base md:text-lg font-bold text-rich-black">{title}</h2>
        {subtitle && <p className="text-xs text-rich-black/50 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function ChangeBadge({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null) return <span className="text-[11px] text-rich-black/40">no earlier data</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`text-[11px] font-semibold ${value === 0 ? 'text-rich-black/50' : good ? 'text-green-700' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}% <span className="font-normal text-rich-black/40">vs previous period</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: typeof Activity;
  tone?: 'neutral' | 'urgent' | 'warn';
  onClick?: () => void;
  active?: boolean;
  /** Listed so tiles can be rendered in loops (the project has no React type package). */
  key?: string;
}) {
  const toneRing = tone === 'urgent' ? 'border-red-200' : tone === 'warn' ? 'border-amber-200' : 'border-warm-gray/60';
  const iconTone = tone === 'urgent' ? 'text-red-600 bg-red-50' : tone === 'warn' ? 'text-amber-700 bg-amber-50' : 'text-rich-black/60 bg-primary-bg';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white border ${active ? 'border-rich-black ring-2 ring-rich-black/10' : toneRing} rounded-2xl p-4 shadow-sm min-w-0 ${
        onClick ? 'hover:border-rich-black/40 transition-colors cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-rich-black/55 leading-tight">{label}</p>
        {Icon && (
          <span className={`p-1.5 rounded-lg shrink-0 ${iconTone}`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-rich-black mt-1.5 tabular-nums truncate">{value}</p>
      {hint && <div className="mt-1 text-[11px] text-rich-black/50">{hint}</div>}
    </Tag>
  );
}

function StageBadge({ stage }: { stage: LiveStage }) {
  const s = STAGE_STYLE[stage];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${s.badge}`}>
      <Icon size={11} /> {STAGE_LABELS[stage]}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-rich-black/45">{text}</div>;
}

const kesTick = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [tab, setTab] = useState<Tab>('live');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');

  // Live table filters
  const [stageFilter, setStageFilter] = useState<LiveStage | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // ---- Data: one live feed of every request, plus new complaints ----
  useEffect(() => {
    const unsubRequests = onSnapshot(
      collection(db, 'serviceRequests'),
      (snap) => {
        setRequests(snap.docs.map((d) => normalizeRequest(d.id, d.data())));
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'serviceRequests');
        setLoadError('Could not load requests. Make sure you are signed in with the admin account.');
        setLoading(false);
      }
    );
    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), where('status', '==', 'new')),
      (snap) => {
        setComplaints(
          snap.docs
            .map((d) => {
              const data = d.data();
              return { id: d.id, taskId: data.taskId, reason: data.reason, reporterRole: data.reporterRole, timestamp: toDate(data.timestamp) };
            })
            .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'complaints')
    );
    // Waiting times and expiry move on their own, so refresh the clock every minute.
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      unsubRequests();
      unsubComplaints();
      clearInterval(tick);
    };
  }, []);

  // ---- Metrics ----
  const live = useMemo(() => liveSummary(requests, now), [requests, now]);
  const period = useMemo(() => makePeriod(periodKey, new Date(now)), [periodKey, now]);
  const prev = useMemo(() => previousPeriod(period), [period]);
  const perf = useMemo(() => performance(requests, period), [requests, period]);
  const perfPrev = useMemo(() => (prev ? performance(requests, prev) : null), [requests, prev]);
  const cash = useMemo(() => money(requests, period), [requests, period]);
  const cashPrev = useMemo(() => (prev ? money(requests, prev) : null), [requests, prev]);

  const complaintTaskIds = useMemo(() => new Set(complaints.map((c) => c.taskId).filter(Boolean)), [complaints]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.rows.filter(
      (r) =>
        (stageFilter === 'all' || r.stage === stageFilter) &&
        (categoryFilter === 'all' || r.category === categoryFilter) &&
        (!q ||
          [r.serviceType, r.clientName, r.providerName || '', r.location, r.id].some((v) => v.toLowerCase().includes(q)))
    );
  }, [live.rows, stageFilter, categoryFilter, search]);

  // ---- Admin actions (firestore.rules let the admin update any request) ----
  async function runAction(r: LiveRow, action: 'repost' | 'reopen' | 'cancel') {
    const messages = {
      repost: `Re-offer "${r.serviceType}" to providers for another 3 hours?`,
      reopen: `Remove ${r.providerName || 'the provider'} from "${r.serviceType}" and offer it to other providers?`,
      cancel: `Cancel "${r.serviceType}" for ${r.clientName || 'this client'}? This cannot be undone from the dashboard.`,
    };
    if (!window.confirm(messages[action])) return;

    const fields: Record<string, any> =
      action === 'repost'
        ? { postedAt: serverTimestamp() }
        : action === 'reopen'
          ? {
              status: 'pending',
              providerId: deleteField(),
              providerName: deleteField(),
              acceptedAt: deleteField(),
              confirmedAt: deleteField(),
              postedAt: serverTimestamp(),
            }
          : { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'admin' };

    setBusyId(r.id);
    try {
      await updateDoc(doc(db, 'serviceRequests', r.id), { ...fields, updatedAt: serverTimestamp() });
      toast.success(action === 'cancel' ? 'Request cancelled' : action === 'reopen' ? 'Request reopened for other providers' : 'Request re-offered for 3 hours');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `serviceRequests/${r.id}`);
      toast.error('That change was not saved. Check your connection and admin access.');
    } finally {
      setBusyId(null);
    }
  }

  // ---- Export ----
  function exportData(kind: 'csv' | 'xlsx') {
    const scope =
      tab === 'live'
        ? filteredRows
        : requests.filter((r) => inPeriod(r.createdAt, period) || inPeriod(r.completedAt, period) || inPeriod(r.cancelledAt, period));
    if (!scope.length) {
      toast.info('Nothing to export for this view.');
      return;
    }
    const rows = exportRows(scope, now);
    const stamp = formatDateTime(new Date(now)).slice(0, 10);
    const name = tab === 'live' ? `TaskMolly_live_requests_${stamp}` : `TaskMolly_${tab}_${period.key}_${stamp}`;

    if (kind === 'csv') {
      const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Requests');
    if (tab !== 'live') {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          { Metric: 'Period', Value: PERIOD_LABELS[period.key] },
          { Metric: 'Requests posted', Value: perf.posted },
          { Metric: 'Completed jobs', Value: perf.completed },
          { Metric: 'Cancelled', Value: perf.cancelled },
          { Metric: 'Expired with no pro', Value: perf.expired },
          { Metric: 'Completion rate', Value: formatPercent(perf.completionRate) },
          { Metric: 'Agreed value of completed jobs (KES)', Value: cash.gross },
          { Metric: 'Task Molly commission (KES)', Value: cash.commission },
          { Metric: 'Provider payouts (KES)', Value: cash.payouts },
          { Metric: 'Average job value (KES)', Value: cash.average === null ? '' : Math.round(cash.average) },
        ]),
        'Summary'
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          perf.byCategory.map((c) => {
            const m = cash.byCategory.find((x) => x.category === c.category);
            return {
              Category: c.category,
              Completed: c.completed,
              Cancelled: c.cancelled,
              Expired: c.expired,
              'Completion rate': formatPercent(c.completionRate),
              'Median time to accept': formatDuration(c.medianAcceptMs),
              'Agreed value (KES)': m?.gross ?? 0,
              'Commission (KES)': m?.commission ?? 0,
            };
          })
        ),
        'By category'
      );
    }
    XLSX.writeFile(wb, `${name}.xlsx`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const needsAction = live.counts.issue + live.counts.expired + live.counts.expiring;

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] pt-6 md:pt-10 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-rich-black/45 text-[11px] font-semibold mb-1">
              <ShieldCheck size={13} className="text-accent-gold" /> Admin
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-rich-black tracking-tight">Operations dashboard</h1>
            <p className="text-xs text-rich-black/50 mt-1">
              Live from Firestore · {requests.length.toLocaleString()} requests in total
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab !== 'live' && (
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                className="bg-white border border-warm-gray rounded-xl px-3 py-2 text-xs font-semibold text-rich-black"
                aria-label="Period"
              >
                {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
                  <option key={k} value={k}>
                    {PERIOD_LABELS[k]}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-1.5 bg-white border border-warm-gray px-3 py-2 rounded-xl text-xs font-semibold text-rich-black hover:border-rich-black/40"
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={() => exportData('xlsx')}
              className="flex items-center gap-1.5 bg-rich-black text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-rich-black/90"
            >
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-warm-gray/60 rounded-2xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-rich-black text-white' : 'text-rich-black/60 hover:text-rich-black'
              }`}
            >
              {t.label}
              {t.id === 'live' && needsAction > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {needsAction}
                </span>
              )}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" /> {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'live' ? (
          renderLive()
        ) : tab === 'performance' ? (
          renderPerformance()
        ) : (
          renderMoney()
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/admin-complaints"
            className="px-5 py-3 bg-white border border-warm-gray rounded-xl text-xs font-semibold text-rich-black hover:border-rich-black/40 flex items-center gap-2"
          >
            <AlertTriangle size={14} className="text-red-500" /> Complaints
          </Link>
          <Link
            to="/admin-analytics"
            className="px-5 py-3 bg-white border border-warm-gray rounded-xl text-xs font-semibold text-rich-black hover:border-rich-black/40 flex items-center gap-2"
          >
            <Layers size={14} className="text-accent-gold" /> Site analytics
          </Link>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Screen 1: live operations
  // ---------------------------------------------------------------------------
  function renderLive() {
    const tiles: { stage: LiveStage; tone: 'neutral' | 'urgent' | 'warn'; hint?: ReactNode }[] = [
      { stage: 'issue', tone: live.counts.issue ? 'urgent' : 'neutral', hint: 'Client flagged the finished work' },
      { stage: 'expired', tone: live.counts.expired ? 'urgent' : 'neutral', hint: 'Repost or cancel' },
      { stage: 'expiring', tone: live.counts.expiring ? 'warn' : 'neutral', hint: 'Under 30 min left' },
      {
        stage: 'open',
        tone: 'neutral',
        hint: live.oldestOpenMs !== null ? `Oldest waiting ${formatDuration(live.oldestOpenMs)}` : 'None waiting',
      },
      { stage: 'accepted', tone: 'neutral', hint: 'Client must confirm the pro' },
      { stage: 'assigned', tone: 'neutral', hint: 'Waiting for the pro to start' },
      { stage: 'in-progress', tone: 'neutral', hint: 'Work underway' },
      { stage: 'awaiting-confirmation', tone: 'neutral', hint: 'Pro marked it done' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Active requests" value={live.activeTotal} icon={Activity} hint="Not yet completed or cancelled" />
          <StatTile
            label="Need your attention"
            value={needsAction}
            icon={AlertTriangle}
            tone={needsAction ? 'urgent' : 'neutral'}
            hint="Issues, expired and expiring"
          />
          <StatTile label="Value in flight" value={formatKES(live.valueInFlight)} icon={Wallet} hint="Confirmed jobs not yet signed off" />
          <Link to="/admin-complaints" className="block min-w-0 rounded-2xl hover:opacity-90">
            <StatTile
              label="New complaints"
              value={complaints.length}
              icon={AlertTriangle}
              tone={complaints.length ? 'warn' : 'neutral'}
              hint={<span className="inline-flex items-center gap-0.5">Open resolution center <ChevronRight size={11} /></span>}
            />
          </Link>
        </div>

        <Card>
          <SectionTitle title="Request pipeline" subtitle="Tap a stage to filter the table below" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <StatTile
                key={t.stage}
                label={STAGE_LABELS[t.stage]}
                value={live.counts[t.stage]}
                icon={STAGE_STYLE[t.stage].icon}
                tone={t.tone}
                hint={t.hint}
                active={stageFilter === t.stage}
                onClick={() => setStageFilter(stageFilter === t.stage ? 'all' : t.stage)}
              />
            ))}
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 md:p-6 pb-4">
            <SectionTitle
              title="Live requests"
              subtitle={`${filteredRows.length} of ${live.activeTotal} active · most urgent first`}
              right={
                (stageFilter !== 'all' || categoryFilter !== 'all' || search) && (
                  <button
                    onClick={() => {
                      setStageFilter('all');
                      setCategoryFilter('all');
                      setSearch('');
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-rich-black/60 hover:text-rich-black"
                  >
                    <X size={13} /> Clear filters
                  </button>
                )
              }
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rich-black/35" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search service, client, provider, location"
                  className="w-full bg-primary-bg border border-warm-gray rounded-xl pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as LiveStage | 'all')}
                className="bg-primary-bg border border-warm-gray rounded-xl px-3 py-2 text-sm"
                aria-label="Stage"
              >
                <option value="all">All stages</option>
                {ACTIVE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-primary-bg border border-warm-gray rounded-xl px-3 py-2 text-sm"
                aria-label="Category"
              >
                <option value="all">All categories</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState text={live.activeTotal ? 'No requests match these filters.' : 'No active requests right now.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-rich-black/50 border-y border-warm-gray/60 bg-primary-bg/60">
                    <th className="px-5 py-2.5">Request</th>
                    <th className="px-3 py-2.5">Stage</th>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Provider</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5">In this stage</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-b border-warm-gray/40 last:border-0 align-top hover:bg-primary-bg/40">
                      <td className="px-5 py-3 max-w-[260px]">
                        <p className="font-semibold text-rich-black truncate">{r.serviceType}</p>
                        <p className="text-[11px] text-rich-black/50 truncate">
                          {r.category}
                          {r.location ? ` · ${r.location}` : ''}
                        </p>
                        {complaintTaskIds.has(r.id) && (
                          <p className="text-[11px] font-semibold text-red-600 mt-0.5">Has an open complaint</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StageBadge stage={r.stage} />
                        {r.expiresAt && r.stage !== 'expired' && (
                          <p className="text-[11px] text-rich-black/45 mt-1">Expires {formatDateTime(r.expiresAt).slice(11)}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-rich-black/80">{r.clientName || <span className="text-rich-black/35">{r.clientId.slice(0, 8)}</span>}</td>
                      <td className="px-3 py-3 text-rich-black/80">{r.providerName || <span className="text-rich-black/35">—</span>}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-rich-black">{formatKES(r.price)}</td>
                      <td className="px-3 py-3 tabular-nums">
                        <span className={STAGE_STYLE[r.stage].urgent ? 'text-red-700 font-semibold' : 'text-rich-black/70'}>
                          {r.since ? formatDuration(r.waitingMs) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {['open', 'expiring', 'expired'].includes(r.stage) && (
                            <ActionButton icon={RefreshCw} label="Repost" disabled={busyId === r.id} onClick={() => runAction(r, 'repost')} />
                          )}
                          {['accepted', 'assigned'].includes(r.stage) && (
                            <ActionButton icon={UserX} label="Reopen" disabled={busyId === r.id} onClick={() => runAction(r, 'reopen')} />
                          )}
                          <ActionButton icon={Ban} label="Cancel" danger disabled={busyId === r.id} onClick={() => runAction(r, 'cancel')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {complaints.length > 0 && (
          <Card>
            <SectionTitle
              title="New complaints"
              subtitle="Filed by clients or providers and not yet picked up"
              right={
                <Link to="/admin-complaints" className="text-xs font-semibold text-rich-black/70 hover:text-rich-black flex items-center gap-1">
                  Resolution center <ChevronRight size={13} />
                </Link>
              }
            />
            <ul className="divide-y divide-warm-gray/50">
              {complaints.slice(0, 5).map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                    <AlertTriangle size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rich-black truncate">{c.reason || 'Complaint'}</p>
                    <p className="text-[11px] text-rich-black/50">
                      From a {c.reporterRole === 'tasker' ? 'provider' : 'client'}
                      {c.timestamp ? ` · ${formatDuration(now - c.timestamp.getTime())} ago` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Screen 2: performance (outcomes and speed)
  // ---------------------------------------------------------------------------
  function renderPerformance() {
    const maxCompleted = Math.max(1, ...perf.byCategory.map((c) => c.completed));
    const hasOutcomes = perf.completed + perf.cancelled + perf.expired > 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile label="Requests posted" value={perf.posted} icon={Activity} hint={<ChangeBadge value={change(perf.posted, perfPrev?.posted)} />} />
          <StatTile label="Completed jobs" value={perf.completed} icon={CheckCircle2} hint={<ChangeBadge value={change(perf.completed, perfPrev?.completed)} />} />
          <StatTile
            label="Completion rate"
            value={formatPercent(perf.completionRate)}
            icon={Timer}
            hint="Completed ÷ (completed + cancelled + expired)"
          />
          <StatTile label="Cancelled" value={perf.cancelled} icon={Ban} hint={<ChangeBadge value={change(perf.cancelled, perfPrev?.cancelled)} goodWhenUp={false} />} />
          <StatTile
            label="Expired, nobody accepted"
            value={perf.expired}
            icon={UserX}
            tone={perf.expired ? 'warn' : 'neutral'}
            hint={<ChangeBadge value={change(perf.expired, perfPrev?.expired)} goodWhenUp={false} />}
          />
        </div>

        <Card>
          <SectionTitle title="Outcomes over time" subtitle={`${PERIOD_LABELS[period.key]} · counted on the day each outcome happened`} />
          {hasOutcomes ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perf.trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(45,49,66,0.05)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="completed" name="Completed" stackId="o" fill={OUTCOME_COLORS.completed} stroke="#fff" strokeWidth={1} />
                  <Bar dataKey="cancelled" name="Cancelled" stackId="o" fill={OUTCOME_COLORS.cancelled} stroke="#fff" strokeWidth={1} />
                  <Bar dataKey="expired" name="Expired" stackId="o" fill={OUTCOME_COLORS.expired} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="No completed, cancelled or expired requests in this period." />
          )}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 md:p-6 pb-2">
            <SectionTitle title="Categories" subtitle="Ranked by completed jobs. Expired requests show where you need more providers." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-rich-black/50 border-y border-warm-gray/60 bg-primary-bg/60">
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-3 py-2.5 w-[30%]">Completed</th>
                  <th className="px-3 py-2.5 text-right">Cancelled</th>
                  <th className="px-3 py-2.5 text-right">Expired</th>
                  <th className="px-3 py-2.5 text-right">Completion rate</th>
                  <th className="px-5 py-2.5 text-right">Median time to accept</th>
                </tr>
              </thead>
              <tbody>
                {perf.byCategory.map((c) => (
                  <tr key={c.category} className="border-b border-warm-gray/40 last:border-0">
                    <td className="px-5 py-3 font-semibold text-rich-black">{c.category}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-primary-bg overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(c.completed / maxCompleted) * 100}%`, background: OUTCOME_COLORS.completed }} />
                        </div>
                        <span className="tabular-nums font-semibold text-rich-black w-8 text-right">{c.completed}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-rich-black/70">{c.cancelled}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${c.expired ? 'text-amber-700 font-semibold' : 'text-rich-black/70'}`}>{c.expired}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-rich-black">{formatPercent(c.completionRate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-rich-black/70">{formatDuration(c.medianAcceptMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Speed" subtitle="Median times for steps that finished in this period" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {perf.speed.map((s) => (
              <StatTile
                key={s.label}
                label={s.label}
                value={formatDuration(s.medianMs)}
                icon={Clock}
                hint={
                  <>
                    {s.description}
                    <br />
                    {s.samples} {s.samples === 1 ? 'job' : 'jobs'}
                  </>
                }
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Screen 3: money
  // ---------------------------------------------------------------------------
  function renderMoney() {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            These are <strong>agreed prices</strong> on jobs the client signed off, not money collected. Payments are not processed in the
            app yet, so treat this as expected revenue until M-Pesa is connected.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Agreed value of completed jobs" value={formatKES(cash.gross)} icon={Wallet} hint={<ChangeBadge value={change(cash.gross, cashPrev?.gross)} />} />
          <StatTile label="Task Molly commission" value={formatKES(cash.commission)} icon={ShieldCheck} hint={<ChangeBadge value={change(cash.commission, cashPrev?.commission)} />} />
          <StatTile label="Provider payouts" value={formatKES(cash.payouts)} icon={Wrench} hint={`${cash.jobs} completed ${cash.jobs === 1 ? 'job' : 'jobs'}`} />
          <StatTile
            label="Average job value"
            value={cash.average === null ? '—' : formatKES(cash.average)}
            icon={Activity}
            hint={cash.average === null ? 'No completed jobs yet' : <ChangeBadge value={change(cash.average, cashPrev?.average)} />}
          />
        </div>

        <Card>
          <SectionTitle title="Agreed value over time" subtitle={`${PERIOD_LABELS[period.key]} · by sign-off date`} />
          {cash.jobs ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cash.trend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tickFormatter={kesTick} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(45,49,66,0.05)' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }}
                    formatter={(value: any, _name: any, item: any) => [
                      `${formatKES(Number(value))} · ${item?.payload?.jobs ?? 0} jobs · commission ${formatKES(item?.payload?.commission ?? 0)}`,
                      'Agreed value',
                    ]}
                  />
                  <Bar dataKey="gross" name="Agreed value" fill={INK} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="No jobs were signed off in this period." />
          )}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 md:p-6 pb-2">
            <SectionTitle title="Value by category" subtitle="Ranked by agreed value of completed jobs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-rich-black/50 border-y border-warm-gray/60 bg-primary-bg/60">
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-3 py-2.5 w-[28%]">Agreed value</th>
                  <th className="px-3 py-2.5 text-right">Jobs</th>
                  <th className="px-3 py-2.5 text-right">Commission</th>
                  <th className="px-3 py-2.5 text-right">Average job</th>
                  <th className="px-5 py-2.5 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {cash.byCategory.map((c) => (
                  <tr key={c.category} className="border-b border-warm-gray/40 last:border-0">
                    <td className="px-5 py-3 font-semibold text-rich-black">{c.category}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-primary-bg overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${cash.gross ? (c.gross / cash.gross) * 100 : 0}%`, background: INK }} />
                        </div>
                        <span className="tabular-nums font-semibold text-rich-black whitespace-nowrap">{formatKES(c.gross)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-rich-black/70">{c.jobs}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-rich-black/70">{formatKES(c.commission)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-rich-black/70">{c.average === null ? '—' : formatKES(c.average)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-rich-black">{cash.gross ? formatPercent(c.gross / cash.gross) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Activity;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold disabled:opacity-40 transition-colors ${
        danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-warm-gray text-rich-black/80 hover:border-rich-black/40'
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}
