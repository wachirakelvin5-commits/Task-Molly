import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Clock, Send, PenLine, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../firebase';
import { ESTIMATE_MINUTES, checkBackTime } from '../lib/checkBackTime';
import { createServiceRequest } from '../lib/serviceRequests';
import { savePendingRequest } from '../lib/pendingRequestService';
import { CONCIERGE_TAGLINE, buildConciergeRequest, tasksLink } from '../lib/conciergeRequest';

// task-molly providers: a single "task-molly concierge" placard (opened from the pen icon).
// Top: the pen (same as the home page) and "Premium Requests (a month +)". Middle: a notepad.
// Bottom: Ask Molly logs the task (signed in: straight to Tasks → New Tasks; signed out: kept
// in the browser until they sign up / sign in), says when to check back, then
// "Go to tasks & requests" (through sign-up / sign-in if needed).
// The page itself doesn't scroll.

const GOLD_DARK = '#8f7a5a'; // darker brand gold for buttons and text on gold

type CalcState = 'idle' | 'calculating' | 'done';

export default function PremiumPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [calc, setCalc] = useState<CalcState>('idle');
  const [checkBack, setCheckBack] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = 'task-molly concierge';
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const changed = () => { if (calc !== 'idle') setCalc('idle'); };
  const hasNeed = notes.trim().length > 0;

  // Ask Molly: log the task, note the time now (Kenya time) and show when to check back.
  const askMolly = async () => {
    if (!hasNeed || calc === 'calculating') return;
    const askedAt = new Date();
    setCalc('calculating');
    const started = Date.now();

    const request = buildConciergeRequest(notes, askedAt);
    const user = auth.currentUser;
    try {
      if (user) {
        await createServiceRequest(user.uid, { ...request, clientName: user.displayName || undefined });
      } else {
        // No account yet: keep it in this browser; it's saved to their account after sign-up / sign-in.
        savePendingRequest(request);
      }
    } catch (err) {
      console.error('[Concierge] Could not log the task:', err);
      toast.error('Molly could not log your task. Please try again.');
      setCalc('idle');
      return;
    }

    setCheckBack(checkBackTime(askedAt));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCalc('done'), Math.max(0, 1600 - (Date.now() - started)));
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col pt-5 md:pt-7 pb-5 bg-primary-bg">
      <div className="shrink-0 px-5 md:px-10 w-full max-w-7xl mx-auto mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-rich-black/60 hover:text-accent-gold transition-colors" aria-label="Back to task-molly home">
          <ChevronLeft size={16} />
          <span className="font-semibold text-rich-black">task-</span><span className="font-light text-accent-gold -ml-1">molly</span>
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex justify-center px-5">
        <section
          className="w-full max-w-[380px] h-full max-h-[720px] rounded-[2rem] p-4 flex flex-col gap-3 shadow-[0_20px_50px_-20px_rgba(143,122,90,0.6)]"
          style={{ background: 'linear-gradient(160deg, #c9b48f 0%, #b59d7a 55%, #a48b67 100%)' }}
        >
          {/* Top: the pen, like the one on the home page */}
          <header className="flex items-center gap-3 px-1 pt-1">
            <div className="shrink-0 w-14 h-14 rounded-full bg-[#FFFBEB] flex items-center justify-center ring-2 ring-white/60 text-rich-black">
              <PenLine size={26} className="transform rotate-[-15deg]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold text-white leading-tight drop-shadow-sm">task-molly concierge</h1>
              <p className="text-[12px] text-white/85 leading-snug mt-0.5">{CONCIERGE_TAGLINE}</p>
            </div>
          </header>

          {/* Middle: notepad to curate the need */}
          <div className="flex-1 min-h-0 rounded-2xl bg-[#FFFBEB] p-3 flex flex-col">
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value.slice(0, 1000)); changed(); }}
              placeholder="What you need…"
              aria-label="What you need"
              className="flex-1 min-h-0 w-full resize-none bg-transparent text-sm text-rich-black placeholder:text-rich-black/35 focus:outline-none"
              style={{
                lineHeight: '28px',
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(181,157,122,0.35) 27px, rgba(181,157,122,0.35) 28px)',
                backgroundAttachment: 'local',
              }}
            />
          </div>

          {/* Bottom: Ask Molly, then when to check back */}
          <div className="shrink-0 rounded-2xl bg-white/90 p-3.5 min-h-[112px] flex items-center">
            <AnimatePresence mode="wait">
              {calc === 'idle' && (
                <motion.button
                  key="ask"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  type="button"
                  onClick={askMolly}
                  disabled={!hasNeed}
                  title={hasNeed ? undefined : 'Write what you need first'}
                  className="w-full h-[52px] rounded-xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: GOLD_DARK }}
                >
                  <Send size={14} /> Ask Molly
                </motion.button>
              )}
              {calc === 'calculating' && (
                <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <p className="text-xs font-semibold text-rich-black/70 mb-2">Calculating…</p>
                  <div className="h-1.5 rounded-full bg-accent-gold/20 overflow-hidden">
                    <motion.div className="h-full bg-accent-gold" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
                  </div>
                </motion.div>
              )}
              {calc === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                  <p className="flex items-start gap-2 text-[13px] leading-snug text-rich-black/85">
                    <Clock size={16} className="shrink-0 mt-0.5" style={{ color: GOLD_DARK }} />
                    <span>
                      You will get your estimate in {ESTIMATE_MINUTES} minutes. Check back at{' '}
                      <strong className="text-rich-black">{checkBack}</strong>.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(tasksLink(!!auth.currentUser))}
                    className="mt-2.5 w-full h-[40px] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                    style={{ background: GOLD_DARK }}
                  >
                    Go to tasks &amp; requests <ArrowRight size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

    </div>
  );
}
