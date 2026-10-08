import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, Plus, Download, Inbox, Activity, Receipt } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate } from 'react-router-dom';
import ComplaintModal from '../components/ComplaintModal';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestCard, { CardButton } from '../components/RequestCard';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getPendingRequest, finalizePendingRequest as syncPendingRequestService } from '../lib/pendingRequestService';
import {
  REQUEST_EXPIRY_MS,
  cancelRequest,
  confirmCompletion,
  confirmProvider,
  isRequestExpired,
  rejectProvider,
  repostRequest,
  reportIssue,
  toDate,
} from '../lib/serviceRequests';

type TaskTab = 'new' | 'ongoing' | 'history';

const TAB_STATUSES: Record<TaskTab, string[]> = {
  new: ['pending', 'accepted'],
  ongoing: ['assigned', 'in-progress', 'awaiting-confirmation'],
  history: ['completed', 'cancelled'],
};

const EMPTY_MESSAGES: Record<TaskTab, string> = {
  new: 'No new tasks. Requests you post appear here until a pro is confirmed.',
  ongoing: 'No ongoing tasks. Jobs move here once you confirm a pro.',
  history: 'No completed or cancelled tasks yet.',
};

function formatRemaining(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

interface ClientTasksProps {
  user: UserProfile;
}

export default function ClientTasks({ user }: ClientTasksProps) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskViewTab, setTaskViewTab] = useState<TaskTab>('new');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [complaintJob, setComplaintJob] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Re-evaluate expiry countdowns every minute.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // A request filled in before login is posted once the user lands here signed in.
  useEffect(() => {
    if (!user.uid) return;

    const checkAndSync = async () => {
      if (!getPendingRequest() || isSyncing) return;
      setIsSyncing(true);
      try {
        await syncPendingRequestService(user);
      } finally {
        setIsSyncing(false);
      }
    };

    checkAndSync();
    const interval = setInterval(checkAndSync, 8000);
    return () => clearInterval(interval);
  }, [user.uid, isSyncing]);

  useEffect(() => {
    if (!user.uid) {
      setLoading(false);
      return;
    }

    if (!auth.currentUser) {
      const timeout = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timeout);
    }

    const q = query(collection(db, 'serviceRequests'), where('clientId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (toDate(b.createdAt)?.getTime() ?? Infinity) - (toDate(a.createdAt)?.getTime() ?? Infinity));
      setRequests(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'serviceRequests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const runAction = async (requestId: string, action: () => Promise<void>, successMessage: string) => {
    setBusyId(requestId);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      console.error('Request action failed:', err);
      toast.error('That action is no longer available. The task may have changed – please check its latest status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (request: any) => {
    if (!window.confirm(`Cancel your ${request.serviceType} request?`)) return;
    runAction(request.id, () => cancelRequest(request.id), 'Request cancelled');
  };

  const tabRequests = (tab: TaskTab) => requests.filter(r => TAB_STATUSES[tab].includes(r.status));
  const visibleRequests = tabRequests(taskViewTab);
  const completedRequests = requests.filter(r => r.status === 'completed');

  const handleDownloadHistory = () => {
    const rows = tabRequests('history');
    if (rows.length === 0) {
      toast.info('No task history to download yet.');
      return;
    }
    try {
      const pdf = new jsPDF() as any;
      pdf.setFontSize(16);
      pdf.text('Task Molly – Task History', 14, 18);
      pdf.setFontSize(9);
      pdf.text(`${user.displayName || 'Client'} • Generated ${new Date().toLocaleString()}`, 14, 25);
      pdf.autoTable({
        startY: 32,
        head: [['Date', 'Service', 'Pro', 'Location', 'Amount (KES)', 'Status']],
        body: rows.map(r => [
          toDate(r.completedAt || r.cancelledAt || r.createdAt)?.toLocaleDateString() || '',
          r.serviceType,
          r.providerName || '—',
          r.location || '',
          Number(r.clientPrice ?? r.budget ?? 0).toLocaleString(),
          r.status === 'completed' ? 'Completed' : 'Cancelled',
        ]),
        headStyles: { fillColor: [26, 29, 32] },
        styles: { fontSize: 8 },
      });
      const total = completedRequests.reduce((sum, r) => sum + Number(r.clientPrice ?? r.budget ?? 0), 0);
      pdf.text(`Completed jobs total: KES ${total.toLocaleString()}`, 14, (pdf.lastAutoTable?.finalY || 40) + 10);
      pdf.save('TaskMolly_Task_History.pdf');
    } catch (err) {
      console.error('History PDF generation error:', err);
      toast.error('Failed to generate the PDF');
    }
  };

  const renderClientCard = (request: any) => {
    const busy = busyId === request.id;
    const pro = request.providerName || 'Your pro';

    switch (request.status) {
      case 'pending': {
        if (isRequestExpired(request, now)) {
          return (
            <RequestCard key={request.id} request={request} priceField="clientPrice" badge="Expired"
              note="No pro accepted this within 3 hours, so it's no longer shown to pros. Repost it to try again.">
              <CardButton variant="primary" disabled={busy} onClick={() => runAction(request.id, () => repostRequest(request.id), 'Reposted – pros can see it again')}>
                Repost
              </CardButton>
              <CardButton variant="danger" disabled={busy} onClick={() => handleCancel(request)}>Cancel</CardButton>
            </RequestCard>
          );
        }
        const posted = toDate(request.postedAt) || toDate(request.createdAt);
        const remaining = posted ? formatRemaining(posted.getTime() + REQUEST_EXPIRY_MS - now) : null;
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={<>Shown to <b>{request.serviceCategory || 'matching'}</b> pros{remaining ? ` for another ${remaining}` : ''}. You'll confirm whoever accepts.</>}>
            <CardButton variant="danger" disabled={busy} onClick={() => handleCancel(request)}>Cancel request</CardButton>
          </RequestCard>
        );
      }
      case 'accepted':
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={<><b>{pro}</b> accepted your request. Confirm them to get started, or choose another pro.</>}>
            <CardButton variant="primary" disabled={busy} onClick={() => runAction(request.id, () => confirmProvider(request.id), `${pro} confirmed – moved to Ongoing`)}>
              Confirm {pro}
            </CardButton>
            <CardButton disabled={busy} onClick={() => runAction(request.id, () => rejectProvider(request.id, request.providerId), 'Request reopened for other pros')}>
              Choose another pro
            </CardButton>
          </RequestCard>
        );
      case 'assigned':
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={<><b>{pro}</b> is confirmed for this job and will mark it started when they begin.</>}>
            <CardButton variant="danger" disabled={busy} onClick={() => handleCancel(request)}>Cancel job</CardButton>
          </RequestCard>
        );
      case 'in-progress':
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={<><b>{pro}</b> is working on this. You'll be asked to sign off once they mark it done.</>} />
        );
      case 'awaiting-confirmation':
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={request.issueReportedAt
              ? <>You reported an issue and our team will follow up. Sign off once it's resolved.</>
              : <><b>{pro}</b> marked this job as done. Please confirm the work is complete, or report an issue.</>}>
            <CardButton variant="primary" disabled={busy} onClick={() => runAction(request.id, () => confirmCompletion(request.id), 'Job signed off – thank you!')}>
              Confirm completion
            </CardButton>
            {!request.issueReportedAt && (
              <CardButton variant="danger" disabled={busy} onClick={() => setComplaintJob(request)}>Report issue</CardButton>
            )}
          </RequestCard>
        );
      default:
        return (
          <RequestCard key={request.id} request={request} priceField="clientPrice"
            note={request.status === 'completed' && request.providerName ? <>Completed by <b>{request.providerName}</b>.</> : undefined} />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-primary-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs: { id: TaskTab; label: string; icon: typeof Inbox }[] = [
    { id: 'new', label: 'New Tasks', icon: Inbox },
    { id: 'ongoing', label: 'Ongoing', icon: Activity },
    { id: 'history', label: 'History', icon: Receipt },
  ];
  const needsAction = (r: any) => r.status === 'accepted' || (r.status === 'awaiting-confirmation' && !r.issueReportedAt);

  return (
    <div className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] bg-primary-bg pt-5 md:pt-6 pb-4 px-4 md:px-6 overflow-hidden flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="mb-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3.5 px-6 bg-rich-black hover:bg-black text-accent-gold font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-accent-gold/10 transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer border border-accent-gold/20"
          >
            <Plus size={18} />
            <span>Add New Service Request</span>
          </button>
        </div>

        <div className="flex items-center justify-center mb-3 shrink-0 w-full">
          <div className="flex items-center gap-1.5 bg-neutral-100/70 p-1 rounded-2xl border border-warm-gray/50">
            {tabs.map(({ id, label, icon: Icon }) => {
              const items = tabRequests(id);
              const active = taskViewTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTaskViewTab(id)}
                  className={`relative px-2.5 sm:px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    active ? 'bg-rich-black text-white shadow-sm' : 'bg-white text-rich-black/60 border border-warm-gray/60 hover:border-accent-gold'
                  }`}
                >
                  <Icon size={13} className="text-accent-gold" />
                  <span>{label}</span>
                  <span className={`px-1.5 rounded-full text-[10px] font-bold ${active ? 'bg-accent-gold text-white' : 'bg-warm-gray text-rich-black/60'}`}>
                    {items.length}
                  </span>
                  {items.some(needsAction) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" title="Needs your action" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-2">
          {visibleRequests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
              <Inbox size={32} className="text-accent-gold/60" />
              <p className="text-sm text-rich-black/60 max-w-xs">{EMPTY_MESSAGES[taskViewTab]}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleRequests.map(renderClientCard)}
            </div>
          )}
        </div>

        <div className="pt-3 pb-1 border-t border-warm-gray/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold uppercase tracking-wider text-rich-black/70 hover:text-rich-black shadow-sm transition-all active:scale-95 group cursor-pointer"
          >
            <ArrowLeft size={16} className="text-rich-black/50 group-hover:text-accent-gold transition-colors" />
            <span>Back</span>
          </button>

          {taskViewTab === 'history' ? (
            <button
              onClick={handleDownloadHistory}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-rich-black hover:bg-black text-white hover:text-accent-gold border border-rich-black hover:border-accent-gold/40 rounded-full text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 group cursor-pointer"
            >
              <Download size={15} className="text-accent-gold group-hover:scale-110 transition-transform" />
              <span>Download History</span>
            </button>
          ) : (
            <span className="text-[10px] text-rich-black/40 font-semibold tracking-wide">
              Client Tasks & Requests
            </span>
          )}
        </div>
      </div>

      <ComplaintModal
        isOpen={!!complaintJob}
        onClose={() => setComplaintJob(null)}
        onSubmitted={() => {
          if (complaintJob) {
            reportIssue(complaintJob.id).catch(err => console.error('Could not flag issue on request:', err));
          }
        }}
        taskId={complaintJob?.id || ''}
        reporterId={user.uid}
        reporterRole="client"
        targetId={complaintJob?.providerId || ''}
      />

      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setTaskViewTab('new');
        }}
        userId={user.uid}
        userName={user.displayName || 'Client'}
      />
    </div>
  );
}
