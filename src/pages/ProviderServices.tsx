import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, Download, Inbox, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import RequestCard, { CardButton } from '../components/RequestCard';
import {
  MAX_QUOTE_KES,
  PROVIDER_FEE_RATE,
  ServiceCategory,
  acceptRequest,
  isRequestExpired,
  isValidQuote,
  providerTakeHome,
  takeHomeFor,
  markJobComplete,
  normalizeProviderCategories,
  startJob,
  toDate,
  withdrawAcceptance,
} from '../lib/serviceRequests';

const ACTIVE_STATUSES = ['accepted', 'assigned', 'in-progress', 'awaiting-confirmation'];
const HISTORY_STATUSES = ['completed', 'cancelled'];

type ProviderTab = 'available' | 'active' | 'history';

const byNewest = (a: any, b: any) =>
  (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0);

interface ProviderServicesProps {
  user: UserProfile;
}

export default function ProviderServices({ user }: ProviderServicesProps) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ServiceCategory[]>(() => normalizeProviderCategories(user.services));
  const [activeTab, setActiveTab] = useState<ProviderTab>('available');
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`ignored_tasks_${user.uid}`) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Follow the saved profile (the user prop can be stale after edits, or after an admin
  // approves a verification). Categories are granted by an admin, so only read them here.
  useEffect(() => {
    if (!user.uid) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setCategories(normalizeProviderCategories(snapshot.data()?.services || []));
    }, (err) => console.warn('Could not load provider profile:', err));
  }, [user.uid]);

  // Open requests in this provider's categories.
  useEffect(() => {
    if (!user.uid || categories.length === 0) {
      setOpenRequests([]);
      return;
    }
    const q = query(
      collection(db, 'serviceRequests'),
      where('status', '==', 'pending'),
      where('serviceCategory', 'in', categories)
    );
    return onSnapshot(q, (snapshot) => {
      setOpenRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest));
    }, (err) => {
      console.warn('Could not list open requests:', err);
    });
  }, [user.uid, categories.join('|')]);

  // Everything this provider has accepted, is working on, or has finished.
  useEffect(() => {
    if (!user.uid) return;
    const q = query(
      collection(db, 'serviceRequests'),
      where('providerId', '==', user.uid),
      where('status', 'in', [...ACTIVE_STATUSES, ...HISTORY_STATUSES])
    );
    return onSnapshot(q, (snapshot) => {
      setMyJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest));
    }, (err) => {
      console.warn('Could not list your jobs:', err);
    });
  }, [user.uid]);

  const availableTasks = openRequests.filter(r =>
    r.clientId !== user.uid &&
    !hiddenIds.includes(r.id) &&
    !(r.rejectedProviderIds || []).includes(user.uid) &&
    !isRequestExpired(r, now)
  );
  const activeJobs = myJobs.filter(j => ACTIVE_STATUSES.includes(j.status));
  const historyJobs = myJobs.filter(j => HISTORY_STATUSES.includes(j.status));
  const completedJobs = historyJobs.filter(j => j.status === 'completed');
  const totalEarnings = completedJobs.reduce((sum, j) => sum + (providerTakeHome(j) ?? 0), 0);

  const runAction = async (requestId: string, action: () => Promise<void>, successMessage: string, nextTab?: ProviderTab) => {
    setBusyId(requestId);
    try {
      await action();
      toast.success(successMessage);
      if (nextTab) setActiveTab(nextTab);
    } catch (err) {
      console.error('Job action failed:', err);
      toast.error('That action is no longer available – the request may have been taken, cancelled or expired.');
    } finally {
      setBusyId(null);
    }
  };

  const hideRequest = (requestId: string) => {
    const updated = [...hiddenIds, requestId];
    setHiddenIds(updated);
    localStorage.setItem(`ignored_tasks_${user.uid}`, JSON.stringify(updated));
  };

  const handleDownloadHistory = () => {
    if (historyJobs.length === 0) {
      toast.info('No task history to download yet.');
      return;
    }
    try {
      const pdf = new jsPDF() as any;
      pdf.setFontSize(16);
      pdf.text('Task Molly – Provider Task History', 14, 18);
      pdf.setFontSize(9);
      pdf.text(`${user.displayName || 'Service Provider'} • Generated ${new Date().toLocaleString()}`, 14, 25);
      pdf.autoTable({
        startY: 32,
        head: [['Date', 'Service', 'Client', 'Location', 'Earnings (KES)', 'Status']],
        body: historyJobs.map(j => [
          toDate(j.completedAt || j.cancelledAt || j.createdAt)?.toLocaleDateString() || '',
          j.serviceType,
          j.clientName || 'Client',
          j.location || '',
          j.status === 'completed' ? (providerTakeHome(j) ?? 0).toLocaleString() : '—',
          j.status === 'completed' ? 'Completed' : 'Cancelled',
        ]),
        headStyles: { fillColor: [26, 29, 32] },
        styles: { fontSize: 8 },
      });
      pdf.text(`Total earnings: KES ${totalEarnings.toLocaleString()}`, 14, (pdf.lastAutoTable?.finalY || 40) + 10);
      pdf.save('TaskMolly_Provider_History.pdf');
    } catch (err) {
      console.error('Statement PDF error:', err);
      toast.error('Could not download history PDF');
    }
  };

  const renderJobCard = (job: any) => {
    const busy = busyId === job.id;
    const client = job.clientName || 'The client';
    const contact = [job.clientPhone, job.specificAddress].filter(Boolean).join(' • ');

    switch (job.status) {
      case 'accepted':
        return (
          <RequestCard key={job.id} request={job} priceField="providerPrice"
            note={<>Waiting for <b>{client}</b> to confirm you. You'll be notified here once they do.</>}>
            <CardButton variant="danger" disabled={busy} onClick={() => runAction(job.id, () => withdrawAcceptance(job.id), 'You withdrew from this request')}>
              Withdraw
            </CardButton>
          </RequestCard>
        );
      case 'assigned':
        return (
          <RequestCard key={job.id} request={job} priceField="providerPrice"
            note={<><b>{client}</b> confirmed you for this job.{contact ? <> Contact: {contact}.</> : null} Tap Start when you begin.</>}>
            <CardButton variant="primary" disabled={busy} onClick={() => runAction(job.id, () => startJob(job.id), 'Job started')}>
              Start job
            </CardButton>
          </RequestCard>
        );
      case 'in-progress':
        return (
          <RequestCard key={job.id} request={job} priceField="providerPrice"
            note={<>In progress for <b>{client}</b>.{contact ? <> Contact: {contact}.</> : null} Mark it done when finished – the client then signs off.</>}>
            <CardButton variant="primary" disabled={busy} onClick={() => runAction(job.id, () => markJobComplete(job.id), 'Marked as done – waiting for client sign-off')}>
              Mark job complete
            </CardButton>
          </RequestCard>
        );
      case 'awaiting-confirmation':
        return (
          <RequestCard key={job.id} request={job} priceField="providerPrice"
            note={job.issueReportedAt
              ? <><b>{client}</b> reported an issue with this job. Task Molly support will be in touch.</>
              : <>Waiting for <b>{client}</b> to sign off the completed work.</>} />
        );
      default:
        return <RequestCard key={job.id} request={job} priceField="providerPrice" />;
    }
  };

  const tabs: { id: ProviderTab; label: string; count: number }[] = [
    { id: 'available', label: 'Available Tasks', count: availableTasks.length },
    { id: 'active', label: 'My Jobs', count: activeJobs.length },
    { id: 'history', label: 'Task History', count: historyJobs.length },
  ];

  const emptyState = (message: string) => (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
      <Inbox size={32} className="text-accent-gold/60" />
      <p className="text-sm text-rich-black/60 max-w-xs">{message}</p>
    </div>
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-primary-bg pt-5 md:pt-6 pb-3 px-3 md:px-6 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-warm-gray/40 shrink-0">
          <div className="w-8" />
          <h1 className="text-xl md:text-2xl font-black text-rich-black tracking-tight text-center">
            Pro <span className="text-accent-gold">Dashboard</span>
          </h1>
          <button
            onClick={() => navigate('/provider-my-services')}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold text-rich-black/80 hover:text-rich-black shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles size={13} className="text-accent-gold" />
            <span className="hidden sm:inline">My Services</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar shrink-0 mb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-rich-black text-white shadow-md'
                  : 'bg-white text-rich-black/60 border border-warm-gray hover:border-accent-gold'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-accent-gold text-white font-bold' : 'bg-warm-gray text-rich-black/60'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-2">
          {activeTab === 'available' && (
            categories.length === 0
              ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6 py-6">
                  <div className="w-14 h-14 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-rich-black">No Active Categories Yet</h3>
                  <p className="text-xs text-rich-black/60 max-w-xs">
                    Choose and activate your service categories under My Services to start receiving client job requests.
                  </p>
                  <button
                    onClick={() => navigate('/provider-my-services')}
                    className="mt-1 px-4 py-2 bg-rich-black hover:bg-black text-white hover:text-accent-gold rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    Go to My Services
                  </button>
                </div>
              )
              : availableTasks.length === 0
                ? emptyState(`No open requests in ${categories.join(', ')} right now. New ones appear here automatically.`)
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTasks.map(task => (
                      <RequestCard key={task.id} request={task} priceField="providerPrice" badge="Open request"
                        note={<>Posted by <b>{task.clientName || 'a client'}</b>. Set your price and accept; the client then confirms you before the job is yours.</>}>
                        <QuoteAndAccept
                          defaultPrice={Number(task.budget) > 0 ? Math.round(Number(task.budget)) : undefined}
                          busy={busyId === task.id}
                          onAccept={(price) => runAction(task.id, () => acceptRequest(task.id, { uid: user.uid, displayName: user.displayName }, price), 'Accepted – waiting for the client to confirm you', 'active')}
                          onSkip={() => hideRequest(task.id)}
                        />
                      </RequestCard>
                    ))}
                  </div>
                )
          )}

          {activeTab === 'active' && (
            activeJobs.length === 0
              ? emptyState('No jobs yet. Requests you accept show up here.')
              : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeJobs.map(renderJobCard)}</div>
          )}

          {activeTab === 'history' && (
            historyJobs.length === 0
              ? emptyState('Completed and cancelled jobs will appear here.')
              : (
                <div className="space-y-3">
                  <div className="bg-white border border-warm-gray rounded-2xl px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rich-black/50">
                      {completedJobs.length} completed job{completedJobs.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-sm font-black text-rich-black">KES {totalEarnings.toLocaleString()} earned</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{historyJobs.map(renderJobCard)}</div>
                </div>
              )
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-warm-gray/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/provider-dashboard')}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold uppercase tracking-wider text-rich-black/70 hover:text-rich-black shadow-sm transition-all active:scale-95 group cursor-pointer"
            >
              <ArrowLeft size={14} className="text-rich-black/50 group-hover:text-accent-gold transition-colors" />
              <span>Back</span>
            </button>
            <button
              onClick={() => navigate('/provider-my-services')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold uppercase tracking-wider text-rich-black/70 hover:text-rich-black shadow-sm transition-all active:scale-95 group cursor-pointer"
            >
              <Sparkles size={13} className="text-accent-gold" />
              <span>My Services</span>
            </button>
          </div>

          {activeTab === 'history' && (
            <button
              onClick={handleDownloadHistory}
              className="flex items-center gap-2 px-4 py-1.5 bg-rich-black hover:bg-black text-white hover:text-accent-gold border border-rich-black hover:border-accent-gold/40 rounded-full text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 group cursor-pointer"
            >
              <Download size={14} className="text-accent-gold group-hover:scale-110 transition-transform" />
              <span>Download History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Price box and Accept button on an open request: the provider sets their own price for the job. */
function QuoteAndAccept({ defaultPrice, busy, onAccept, onSkip }: {
  defaultPrice?: number;
  busy: boolean;
  onAccept: (price: number) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(defaultPrice ? String(defaultPrice) : '');
  const price = Number(value);
  const valid = isValidQuote(price);
  const feePercent = Math.round(PROVIDER_FEE_RATE * 100);

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-rich-black/70">
        Your price for this job (KES)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QUOTE_KES}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 2000"
          className="w-full px-3 py-2 rounded-xl border border-warm-gray focus:border-accent-gold outline-none text-sm font-bold text-rich-black bg-white"
        />
      </label>
      <p className="text-[11px] text-rich-black/60">
        {valid
          ? <>You keep <b>KES {takeHomeFor(price).toLocaleString()}</b> after Task Molly's {feePercent}% platform fee (plus VAT on the fee).</>
          : 'Enter a price in whole shillings.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <CardButton variant="primary" disabled={busy || !valid} onClick={() => onAccept(price)}>
          {valid ? `Accept at KES ${price.toLocaleString()}` : 'Accept'}
        </CardButton>
        <CardButton disabled={busy} onClick={onSkip}>Not for me</CardButton>
      </div>
    </div>
  );
}
