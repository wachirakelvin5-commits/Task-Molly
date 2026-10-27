import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Bell, BellRing, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { toDate } from '../../src/lib/requestModel';
import { timeAgo } from './timeAgo';

interface NewComplaint {
  id: string;
  reason: string;
  comment: string;
  reporterRole: string;
  taskId: string;
  timestamp: Date | null;
}

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

/**
 * Bell in the admin top bar. Shows every complaint still marked "new" and alerts the admin
 * (toast, plus a desktop notification if allowed) when one comes in while the site is open.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<NewComplaint[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() => (canNotify() ? Notification.permission : 'denied'));
  const [now, setNow] = useState(() => Date.now());
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let firstLoad = true;
    const unsubscribe = onSnapshot(
      query(collection(db, 'complaints'), where('status', '==', 'new')),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              reason: data.reason || 'Complaint',
              comment: data.comment || '',
              reporterRole: data.reporterRole === 'tasker' ? 'Provider' : 'Client',
              taskId: data.taskId || '',
              timestamp: toDate(data.timestamp),
            };
          })
          .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
        setComplaints(list);

        // Only alert for complaints that arrive after the page loaded.
        if (!firstLoad) {
          snap.docChanges()
            .filter((c) => c.type === 'added')
            .forEach((c) => {
              const item = list.find((x) => x.id === c.doc.id);
              if (item) announce(item);
            });
        }
        firstLoad = false;
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'complaints'),
    );
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, []);

  // Count in the browser tab title, so it shows even when another tab is open.
  useEffect(() => {
    document.title = complaints.length ? `(${complaints.length}) Task Molly Admin` : 'Task Molly Admin';
  }, [complaints.length]);

  // Close the panel on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openComplaint(id?: string) {
    setOpen(false);
    navigate('/admin-complaints', { state: id ? { complaintId: id } : undefined });
  }

  function announce(c: NewComplaint) {
    toast.warning(`New complaint: ${c.reason}`, {
      description: `From a ${c.reporterRole.toLowerCase()}`,
      action: { label: 'View', onClick: () => openComplaint(c.id) },
      duration: 10000,
    });
    if (canNotify() && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      try {
        const n = new Notification(`New complaint: ${c.reason}`, {
          body: c.comment.slice(0, 120) || `From a ${c.reporterRole.toLowerCase()}`,
          icon: '/mask-icon.svg',
          tag: `complaint-${c.id}`,
        });
        n.onclick = () => {
          window.focus();
          openComplaint(c.id);
          n.close();
        };
      } catch {
        // Some browsers (e.g. on phones) only allow notifications from a service worker.
      }
    }
  }

  async function enableDesktopAlerts() {
    if (!canNotify()) return;
    setPermission(await Notification.requestPermission());
  }

  const count = complaints.length;
  const Icon = count ? BellRing : Bell;

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={count ? `${count} new complaints` : 'No new complaints'}
        aria-expanded={open}
        className="relative p-1.5 rounded-lg hover:bg-white/10"
      >
        <Icon size={17} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-12 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] bg-white text-rich-black rounded-2xl shadow-xl border border-warm-gray/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-warm-gray/60">
            <p className="text-sm font-bold">New complaints</p>
            <span className="text-[11px] text-rich-black/50">{count ? `${count} waiting` : 'All clear'}</span>
          </div>

          {canNotify() && permission === 'default' && (
            <button
              onClick={enableDesktopAlerts}
              className="w-full text-left px-4 py-2.5 text-xs bg-primary-bg hover:bg-warm-gray/40 border-b border-warm-gray/60"
            >
              <span className="font-semibold">Turn on desktop alerts</span>
              <span className="text-rich-black/55"> to hear about complaints while this tab is in the background.</span>
            </button>
          )}

          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-rich-black/45">No new complaints.</p>
            ) : (
              complaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openComplaint(c.id)}
                  className="w-full text-left px-4 py-3 border-b border-warm-gray/40 last:border-0 hover:bg-primary-bg flex gap-3"
                >
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{c.reason}</span>
                      <span className="text-[11px] text-rich-black/45 shrink-0">{timeAgo(c.timestamp, now)}</span>
                    </span>
                    {c.comment && <span className="block text-xs text-rich-black/60 line-clamp-2 mt-0.5">{c.comment}</span>}
                    <span className="block text-[11px] text-rich-black/45 mt-1">From a {c.reporterRole.toLowerCase()}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => openComplaint()}
            className="w-full flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold border-t border-warm-gray/60 hover:bg-primary-bg"
          >
            Open complaints <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
