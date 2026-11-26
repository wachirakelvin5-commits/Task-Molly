import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Check, Clock, Send, PenLine } from 'lucide-react';
import { PROVIDER_LIST_SERVICES } from '../data/serviceCatalog';
import { ESTIMATE_MINUTES, checkBackTime } from '../lib/checkBackTime';
import TaskRequestModal from '../components/TaskRequestModal';

// task-molly providers: a single "task-molly concierge" placard (opened from the pen icon).
// Top: the pen (same as the home page). Middle: a notepad to curate the need (tap services,
// write notes). Bottom: Ask Molly, which says when to check back for the estimate.
// The page itself doesn't scroll.

const GOLD_DARK = '#8f7a5a'; // darker brand gold for buttons and text on gold
const REQUEST_SERVICE = 'errand_runner'; // "Errand Runner & Concierge" on the request form

type CalcState = 'idle' | 'calculating' | 'done';

export default function PremiumPage() {
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [calc, setCalc] = useState<CalcState>('idle');
  const [checkBack, setCheckBack] = useState('');
  const [askOpen, setAskOpen] = useState(false);
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
  const toggle = (name: string) => {
    setPicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    changed();
  };

  const hasNeed = picked.length > 0 || notes.trim().length > 0;

  // Ask Molly: note the time now (Kenya time) and show when to check back.
  const askMolly = () => {
    if (!hasNeed) return;
    setCheckBack(checkBackTime(new Date()));
    setCalc('calculating');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCalc('done'), 1600);
  };

  const description = [
    'task-molly concierge',
    ...picked.map((n) => `- ${n}`),
    notes.trim() ? `\n${notes.trim()}` : '',
  ].filter(Boolean).join('\n');

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
            <h1 className="text-[17px] font-semibold text-white leading-tight drop-shadow-sm">task-molly concierge</h1>
          </header>

          {/* Middle: notepad to curate the need */}
          <div className="flex-1 min-h-0 rounded-2xl bg-[#FFFBEB] p-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 max-h-[50%] overflow-y-auto no-scrollbar shrink-0">
              {PROVIDER_LIST_SERVICES.map((s) => {
                const on = picked.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.name)}
                    aria-pressed={on}
                    className={`text-left text-[11px] leading-tight px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-start gap-1 ${
                      on ? 'bg-accent-gold text-white border-accent-gold' : 'bg-white/70 text-rich-black/70 border-accent-gold/30 hover:border-accent-gold'
                    }`}
                  >
                    {on && <Check size={12} className="mt-px shrink-0" />}
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value.slice(0, 1000)); changed(); }}
              placeholder="Write what you need…"
              aria-label="What you need"
              className="flex-1 min-h-[4.5rem] w-full resize-none bg-transparent text-xs text-rich-black placeholder:text-rich-black/35 focus:outline-none"
              style={{
                lineHeight: '24px',
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(181,157,122,0.35) 23px, rgba(181,157,122,0.35) 24px)',
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
                  title={hasNeed ? undefined : 'Pick or write what you need first'}
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
                    onClick={() => setAskOpen(true)}
                    className="mt-2.5 w-full h-[40px] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                    style={{ background: GOLD_DARK }}
                  >
                    <Send size={12} /> Send my details to Molly
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {askOpen && (
          <TaskRequestModal initialService={REQUEST_SERVICE} initialDescription={description} onClose={() => setAskOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
