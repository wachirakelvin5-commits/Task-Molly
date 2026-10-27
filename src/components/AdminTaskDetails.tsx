import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  MapPin,
  MessageSquare,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { STAGE_LABELS, formatDateTime, formatKES, getStage, normalizeRequest } from '../lib/adminMetrics';
import { toDate } from '../lib/requestModel';
import { ChatThread } from './TaskChat';

interface Person {
  email?: string;
  phone?: string;
  displayName?: string;
}

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: ReactNode }) {
  return (
    <section className="py-4 border-b border-warm-gray/60 last:border-0">
      <h3 className="text-xs font-bold text-rich-black/60 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
        <Icon size={13} className="text-accent-gold" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode; key?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-rich-black/50 shrink-0">{label}</span>
      <span className="text-rich-black text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function PersonCard({ role, name, uid, profile }: { role: string; name?: string; uid?: string | null; profile: Person | null }) {
  return (
    <div className="bg-primary-bg/70 border border-warm-gray/60 rounded-xl p-3 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-rich-black/45">{role}</p>
      {uid ? (
        <>
          <p className="text-sm font-bold text-rich-black truncate">{name || profile?.displayName || 'Name not on file'}</p>
          {profile?.phone && (
            <a href={`tel:${profile.phone}`} className="block text-xs text-rich-black/70 hover:underline truncate">
              {profile.phone}
            </a>
          )}
          {profile?.email && (
            <a href={`mailto:${profile.email}`} className="block text-xs text-rich-black/70 hover:underline truncate">
              {profile.email}
            </a>
          )}
          <p className="text-[10px] text-rich-black/35 truncate mt-0.5">ID: {uid}</p>
        </>
      ) : (
        <p className="text-sm text-rich-black/45">Not assigned yet</p>
      )}
    </div>
  );
}

/** Side panel with everything about one task, opened from the live requests table. */
export default function AdminTaskDetails({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [missing, setMissing] = useState(false);
  const [client, setClient] = useState<Person | null>(null);
  const [provider, setProvider] = useState<Person | null>(null);
  const [complaints, setComplaints] = useState<{ id: string; reason: string; status: string; comment: string; timestamp: Date | null }[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // The task itself, live.
  useEffect(() => {
    setData(null);
    setMissing(false);
    return onSnapshot(
      doc(db, 'serviceRequests', requestId),
      (snap) => {
        if (snap.exists()) setData(snap.data());
        else setMissing(true);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `serviceRequests/${requestId}`),
    );
  }, [requestId]);

  // Contact details from the two people's profiles.
  const clientId: string | undefined = data?.clientId;
  const providerId: string | undefined = data?.providerId;
  useEffect(() => {
    let live = true;
    const load = (uid: string | undefined, set: (p: Person | null) => void) => {
      if (!uid) return set(null);
      getDoc(doc(db, 'users', uid))
        .then((s) => live && set(s.exists() ? (s.data() as Person) : {}))
        .catch(() => live && set({}));
    };
    load(clientId, setClient);
    load(providerId, setProvider);
    return () => {
      live = false;
    };
  }, [clientId, providerId]);

  // Complaints about this task.
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'complaints'), where('taskId', '==', requestId)),
        (snap) =>
          setComplaints(
            snap.docs.map((d) => {
              const c = d.data();
              return { id: d.id, reason: c.reason || 'Complaint', status: c.status || 'new', comment: c.comment || '', timestamp: toDate(c.timestamp) };
            }),
          ),
        (err) => handleFirestoreError(err, OperationType.LIST, 'complaints'),
      ),
    [requestId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearInterval(tick);
    };
  }, [onClose]);

  const r = data ? normalizeRequest(requestId, data) : null;
  const stage = r ? getStage(r, now) : null;
  const when = (d: Date | null) => (d ? formatDateTime(d) : null);
  const rejected: string[] = Array.isArray(data?.rejectedProviderIds) ? data!.rejectedProviderIds : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Task details"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-warm-gray/60">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-rich-black/45 tabular-nums">{r?.ref ? `#${r.ref}` : `ID ${requestId}`}</p>
            <h2 className="text-lg font-black text-rich-black leading-tight break-words">{r?.serviceType || 'Task details'}</h2>
            {r && stage && (
              <p className="text-xs text-rich-black/55 mt-0.5">
                {r.category} · <span className="font-semibold text-rich-black">{STAGE_LABELS[stage]}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-primary-bg shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {missing ? (
            <p className="py-16 text-center text-sm text-rich-black/50">This task no longer exists (the client deleted it).</p>
          ) : !data || !r ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Section icon={User} title="People">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <PersonCard role="Client" name={data.clientName} uid={r.clientId} profile={client} />
                  <PersonCard role="Provider" name={data.providerName} uid={r.providerId} profile={provider} />
                </div>
                {data.clientPhone && <Row label="Phone given on the request" value={<a className="hover:underline" href={`tel:${data.clientPhone}`}>{data.clientPhone}</a>} />}
                {rejected.length > 0 && <Row label="Pros the client turned down" value={rejected.length} />}
              </Section>

              <Section icon={FileText} title="Special instructions">
                <p className="text-sm text-rich-black/80 whitespace-pre-wrap">{data.description?.trim() || 'None given.'}</p>
              </Section>

              <Section icon={MapPin} title="Where and when">
                <Row label="Address" value={data.location} />
                <Row label="Unit / apartment" value={data.unitOrApartment} />
                <Row label="Area" value={data.neighborhood} />
                <Row label="Scheduled" value={data.scheduledTime || data.urgency || 'As soon as possible'} />
              </Section>

              <Section icon={Wallet} title="Money">
                <Row label="Client pays" value={formatKES(r.price)} />
                <Row label="Provider earns" value={formatKES(r.payout)} />
                <Row label="Task Molly commission" value={formatKES(r.commission)} />
                <Row label="Payment" value={data.paymentStatus} />
              </Section>

              <Section icon={CalendarClock} title="Timeline">
                <Row label="Posted" value={when(r.createdAt)} />
                {r.postedAt && r.createdAt && r.postedAt.getTime() - r.createdAt.getTime() > 60 * 1000 && <Row label="Reposted" value={when(r.postedAt)} />}
                <Row label="Pro accepted" value={when(r.acceptedAt)} />
                <Row label="Client confirmed the pro" value={when(r.confirmedAt)} />
                <Row label="Work started" value={when(r.startedAt)} />
                <Row label="Pro marked it done" value={when(r.providerCompletedAt)} />
                <Row label="Issue reported" value={when(r.issueReportedAt)} />
                <Row label="Client signed off" value={when(r.completedAt)} />
                <Row label="Cancelled" value={r.cancelledAt ? `${when(r.cancelledAt)}${data.cancelledBy ? ` (by ${data.cancelledBy})` : ''}` : null} />
              </Section>

              <Section icon={AlertTriangle} title={`Complaints (${complaints.length})`}>
                {complaints.length ? (
                  <ul className="space-y-2">
                    {complaints.map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/admin-complaints"
                          state={{ complaintId: c.id }}
                          className="block bg-red-50/60 border border-red-100 rounded-xl p-3 hover:border-red-300"
                        >
                          <p className="text-sm font-semibold text-rich-black flex justify-between gap-2">
                            {c.reason} <span className="text-[10px] uppercase text-red-600 shrink-0">{c.status}</span>
                          </p>
                          {c.comment && <p className="text-xs text-rich-black/60 line-clamp-2 mt-0.5">{c.comment}</p>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-rich-black/45">No complaints about this task.</p>
                )}
              </Section>

              <Section icon={MessageSquare} title="Messages between client and provider">
                {r.providerId || data.status !== 'pending' ? (
                  <ChatThread request={{ id: requestId, status: data.status }} className="max-h-[420px]" />
                ) : (
                  <p className="text-sm text-rich-black/45">Chat opens once a pro accepts the task.</p>
                )}
              </Section>

              <Section icon={Wrench} title="Service">
                <Row label="Category" value={r.category} />
                <Row label="Service ID" value={data.serviceId} />
                <Row label="Request ID" value={<span className="text-xs">{requestId}</span>} />
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
