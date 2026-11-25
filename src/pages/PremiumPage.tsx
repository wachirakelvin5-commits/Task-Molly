import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, Clock, Send, Calculator } from 'lucide-react';
import {
  PREMIUM_PACKAGES, PremiumPackage, estimateMonthly, estimateQuoteMinutes, formatDuration, formatKes,
} from '../data/premiumPackages';
import TaskRequestModal from '../components/TaskRequestModal';

// task-molly providers: one vertical placard per service, in a row you scroll sideways.
// Each placard: the service (top), a notepad to curate your need (middle), a calculator (bottom).
// ?service=<id> scrolls to that placard.

const GOLD_DARK = '#8f7a5a'; // darker brand gold for buttons and text on gold

export default function PremiumPage() {
  const [searchParams] = useSearchParams();
  const rowRef = useRef<HTMLDivElement>(null);
  const [ask, setAsk] = useState<{ service: string; description: string } | null>(null);

  useEffect(() => {
    document.title = 'task-molly providers';
    const id = searchParams.get('service');
    if (id) document.getElementById(`premium-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [searchParams]);

  const scrollBy = (dir: 1 | -1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * Math.min(row.clientWidth * 0.8, 720), behavior: 'smooth' });
  };

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-8 pb-12 bg-primary-bg">
      <div className="px-5 md:px-10 max-w-7xl mx-auto mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-rich-black/60 hover:text-accent-gold transition-colors" aria-label="Back to task-molly home">
          <ChevronLeft size={16} />
          <span className="font-semibold text-rich-black">task-</span><span className="font-light text-accent-gold -ml-1">molly</span>
        </Link>
      </div>
      <div className="px-5 md:px-10 max-w-7xl mx-auto flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent-gold mb-1.5">task-molly providers</p>
          <h1 className="text-2xl md:text-3xl font-light text-rich-black">Premium, made to measure</h1>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scrollBy(-1)} aria-label="Scroll left" className="w-10 h-10 rounded-full border border-accent-gold/50 text-accent-gold hover:bg-accent-gold hover:text-white transition-all flex items-center justify-center cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scrollBy(1)} aria-label="Scroll right" className="w-10 h-10 rounded-full border border-accent-gold/50 text-accent-gold hover:bg-accent-gold hover:text-white transition-all flex items-center justify-center cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* The placards: scroll sideways */}
      <div
        ref={rowRef}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 md:px-10 pb-4 scroll-px-5 md:scroll-px-10"
      >
        {PREMIUM_PACKAGES.map((p) => (
          <Placard key={p.service.id} pkg={p} onAskMolly={(description) => setAsk({ service: p.service.id, description })} />
        ))}
      </div>

      <AnimatePresence>
        {ask && (
          <TaskRequestModal initialService={ask.service} initialDescription={ask.description} onClose={() => setAsk(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

type CalcState = 'idle' | 'calculating' | 'done';

interface PlacardProps {
  key?: string;
  pkg: PremiumPackage;
  onAskMolly: (description: string) => void;
}

function Placard({ pkg, onAskMolly }: PlacardProps) {
  const Icon = pkg.service.IconComponent;
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [calc, setCalc] = useState<CalcState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const changed = () => { if (calc !== 'idle') setCalc('idle'); };
  const toggle = (name: string) => {
    setPicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    changed();
  };

  const hasNeed = picked.length > 0 || notes.trim().length > 0;
  const monthly = estimateMonthly(pkg, picked);
  const minutes = estimateQuoteMinutes(pkg.service.id, picked.length, notes.trim().length);

  const calculate = () => {
    if (!hasNeed) return;
    setCalc('calculating');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCalc('done'), 1600);
  };

  const description = [
    `${pkg.title}`,
    ...picked.map((n) => `- ${n}`),
    notes.trim() ? `\n${notes.trim()}` : '',
  ].filter(Boolean).join('\n');

  return (
    <section
      id={`premium-${pkg.service.id}`}
      className="snap-start shrink-0 w-[86vw] max-w-[340px] md:w-[340px] h-[min(78dvh,680px)] min-h-[560px] rounded-[2rem] p-4 flex flex-col gap-3 shadow-[0_20px_50px_-20px_rgba(143,122,90,0.6)]"
      style={{ background: 'linear-gradient(160deg, #c9b48f 0%, #b59d7a 55%, #a48b67 100%)' }}
    >
      {/* Top: the service */}
      <header className="flex items-center gap-3 px-1 pt-1">
        <div className="shrink-0 w-14 h-14 rounded-full bg-[#FFFBEB] flex items-center justify-center ring-2 ring-white/60">
          <Icon size={40} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-white leading-tight drop-shadow-sm">{pkg.title}</h2>
          <p className="text-[11px] text-white/80 leading-snug mt-0.5 line-clamp-2">{pkg.tagline}</p>
        </div>
      </header>

      {/* Middle: notepad to curate the need */}
      <div className="flex-1 min-h-0 rounded-2xl bg-[#FFFBEB] p-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {pkg.items.map((item) => {
            const on = picked.includes(item.name);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => toggle(item.name)}
                aria-pressed={on}
                className={`text-left text-[11px] leading-tight px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-start gap-1 ${
                  on ? 'bg-accent-gold text-white border-accent-gold' : 'bg-white/70 text-rich-black/70 border-accent-gold/30 hover:border-accent-gold'
                }`}
              >
                {on && <Check size={12} className="mt-px shrink-0" />}
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value.slice(0, 600)); changed(); }}
          placeholder="Write what you need…"
          aria-label={`Notes for ${pkg.title}`}
          className="flex-1 min-h-[4.5rem] w-full resize-none bg-transparent text-xs text-rich-black placeholder:text-rich-black/35 focus:outline-none"
          style={{
            lineHeight: '24px',
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(181,157,122,0.35) 23px, rgba(181,157,122,0.35) 24px)',
            backgroundAttachment: 'local',
          }}
        />
      </div>

      {/* Bottom: calculator */}
      <div className="rounded-2xl bg-white/90 p-3.5">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD_DARK }}>
            <Calculator size={12} /> Estimate
          </span>
          <span className="text-lg font-semibold text-rich-black tabular-nums">
            {monthly > 0 ? formatKes(monthly) : 'KES —'}
            <span className="text-[10px] font-normal text-rich-black/45"> / month</span>
          </span>
        </div>

        <div className="mt-3 h-[52px] flex items-center">
          <AnimatePresence mode="wait">
            {calc === 'idle' && (
              <motion.button
                key="calc"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                type="button"
                onClick={calculate}
                disabled={!hasNeed}
                className="w-full h-full rounded-xl text-white text-sm font-bold tracking-wide transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: GOLD_DARK }}
              >
                {hasNeed ? 'Calculate' : 'Pick or write what you need'}
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
              <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full flex items-center gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-rich-black/80">
                  <Clock size={14} className="shrink-0" style={{ color: GOLD_DARK }} />
                  <span>Quote in about <strong className="text-rich-black">{formatDuration(minutes)}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => onAskMolly(description)}
                  className="shrink-0 h-[44px] px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 active:scale-98 cursor-pointer"
                  style={{ background: GOLD_DARK }}
                >
                  <Send size={13} /> Ask Molly
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
