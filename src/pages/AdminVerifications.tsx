import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, FileText, ShieldCheck } from 'lucide-react';
import { arrayRemove, arrayUnion, collection, doc, getDoc, onSnapshot, serverTimestamp, writeBatch, deleteField } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { ServiceVerification, ServiceVerificationDoc } from '../types';
import { VERIFICATIONS, categoryForService } from '../lib/verificationService';
import { PROVIDER_PROFILES } from '../lib/providerProfile';

/**
 * Admin review of provider verification documents (admin site only).
 * Approving is the only way a provider gains a service category, which is what lets them
 * accept jobs in it (firestore.rules → providerTransition).
 */

type Row = ServiceVerification & { id: string; uid: string; providerName?: string };
type Filter = 'pending' | 'verified' | 'rejected';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'Waiting for review' },
  { id: 'verified', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

function DocPreview({ label, file }: { label: string; file?: ServiceVerificationDoc | null }) {
  if (!file?.dataUrl) {
    return (
      <div className="rounded-xl border border-dashed border-warm-gray p-3 text-xs text-rich-black/40">
        {label}: not provided
      </div>
    );
  }
  const isImage = file.dataUrl.startsWith('data:image/') || /^https?:\/\//.test(file.dataUrl);
  return (
    <div className="rounded-xl border border-warm-gray p-2 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-rich-black/50 mb-1">{label}</p>
      {isImage ? (
        <a href={file.dataUrl} target="_blank" rel="noreferrer">
          <img src={file.dataUrl} alt={label} className="w-full h-40 object-contain bg-primary-bg rounded-lg" />
        </a>
      ) : (
        <a
          href={file.dataUrl}
          download={file.name || `${label}.pdf`}
          className="flex items-center gap-2 text-xs font-semibold text-rich-black underline"
        >
          <FileText size={14} /> Download {file.name || 'file'}
        </a>
      )}
    </div>
  );
}

export default function AdminVerifications() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, VERIFICATIONS),
        (snap) => {
          setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          setLoaded(true);
        },
        (err) => {
          console.error('Could not load verifications:', err);
          toast.error('Could not load verifications');
          setLoaded(true);
        },
      ),
    [],
  );

  const shown = useMemo(
    () =>
      rows
        .filter((r) => r.status === filter)
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')),
    [rows, filter],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { pending: 0, verified: 0, rejected: 0 };
    rows.forEach((r) => {
      if (r.status in c) c[r.status as Filter]++;
    });
    return c;
  }, [rows]);

  const reviewer = () => auth.currentUser?.email || 'admin';

  const approve = async (row: Row) => {
    const category = categoryForService(row.serviceId);
    if (!category) {
      toast.error(`"${row.serviceName}" is not in the service catalog, so it has no category to grant.`);
      return;
    }
    setBusyId(row.id);
    try {
      const user = (await getDoc(doc(db, 'users', row.uid))).data();
      if (!user) throw new Error('Provider account not found');
      const batch = writeBatch(db);
      batch.update(doc(db, VERIFICATIONS, row.id), {
        status: 'verified',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer(),
        rejectionReason: deleteField(),
      });
      batch.update(doc(db, 'users', row.uid), { services: arrayUnion(category) });
      batch.set(
        doc(db, PROVIDER_PROFILES, row.uid),
        {
          uid: row.uid,
          name: String(user.displayName || 'Provider').slice(0, 100),
          services: arrayUnion(category),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await batch.commit();
      toast.success(`Approved. ${row.providerName || 'The provider'} can now take ${category} jobs.`);
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error('Could not approve this verification');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: Row) => {
    const reason = window.prompt('Reason for rejecting (the provider will see this):', row.rejectionReason || '');
    if (reason === null) return;
    setBusyId(row.id);
    try {
      const category = categoryForService(row.serviceId);
      // Take the category away unless another approved service of theirs is in it.
      const stillCovered = rows.some(
        (r) => r.uid === row.uid && r.id !== row.id && r.status === 'verified' && categoryForService(r.serviceId) === category,
      );
      const batch = writeBatch(db);
      batch.update(doc(db, VERIFICATIONS, row.id), {
        status: 'rejected',
        rejectionReason: reason.trim().slice(0, 500) || 'Documents could not be verified',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer(),
      });
      if (category && !stillCovered) {
        batch.update(doc(db, 'users', row.uid), { services: arrayRemove(category) });
        batch.set(
          doc(db, PROVIDER_PROFILES, row.uid),
          { uid: row.uid, services: arrayRemove(category), updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
      await batch.commit();
      toast.success('Rejected');
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error('Could not reject this verification');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-primary-bg px-4 md:px-8 py-6">
      <div className="max-w-[1100px] mx-auto">
        <Link to="/admin-dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-rich-black/60 hover:text-rich-black mb-4">
          <ChevronLeft size={14} /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-rich-black flex items-center gap-2 mb-1">
          <ShieldCheck size={22} className="text-accent-gold" /> Provider verifications
        </h1>
        <p className="text-sm text-rich-black/60 mb-5">
          Providers can only take jobs in a category after you approve their documents here.
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                filter === f.id ? 'bg-rich-black text-white border-rich-black' : 'bg-white text-rich-black border-warm-gray'
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>

        {!loaded ? (
          <p className="text-sm text-rich-black/50">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-rich-black/50">Nothing here.</p>
        ) : (
          <div className="space-y-4">
            {shown.map((row) => {
              const busy = busyId === row.id;
              return (
                <div key={row.id} className="bg-white rounded-2xl border border-warm-gray p-4 md:p-5 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-rich-black truncate">
                        {row.serviceName} <span className="text-rich-black/40 font-normal">· {categoryForService(row.serviceId) || 'no category'}</span>
                      </h2>
                      <p className="text-xs text-rich-black/60 truncate">
                        {row.providerName || 'Provider'} · ID {row.uid} · submitted {when(row.submittedAt)}
                      </p>
                      {row.status !== 'pending' && (
                        <p className="text-xs text-rich-black/50 mt-1">
                          {row.status === 'verified' ? 'Approved' : 'Rejected'} {when(row.reviewedAt)}
                          {(row as any).reviewedBy ? ` by ${(row as any).reviewedBy}` : ''}
                          {row.rejectionReason ? ` – ${row.rejectionReason}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {row.status !== 'verified' && (
                        <button
                          disabled={busy}
                          onClick={() => approve(row)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                      )}
                      {row.status !== 'rejected' && (
                        <button
                          disabled={busy}
                          onClick={() => reject(row)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-red-300 text-red-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <XCircle size={14} /> {row.status === 'verified' ? 'Revoke' : 'Reject'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <DocPreview label="Selfie" file={row.selfie} />
                    <DocPreview label="ID document" file={row.idDocument} />
                    <DocPreview label="Permit / certificate" file={row.credential} />
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-rich-black/70">
                    <div><dt className="inline font-semibold">ID: </dt><dd className="inline">{row.idDocument?.idType?.replace('_', ' ') || '—'} {row.idDocument?.idNumber || ''}</dd></div>
                    <div><dt className="inline font-semibold">Credential: </dt><dd className="inline">{row.credential?.credentialType?.replace('_', ' ') || '—'} {row.credential?.documentNumber || ''}</dd></div>
                    {row.credential?.issuingAuthority && (
                      <div><dt className="inline font-semibold">Issued by: </dt><dd className="inline">{row.credential.issuingAuthority}</dd></div>
                    )}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
