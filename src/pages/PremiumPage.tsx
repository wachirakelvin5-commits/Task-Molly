import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BadgeCheck, Send, Crown } from 'lucide-react';
import { PREMIUM_PACKAGES, PremiumPackage, packageTotal, formatKes } from '../data/premiumPackages';
import TaskRequestModal from '../components/TaskRequestModal';

// task-molly providers: Premium monthly packages, one row per service.
// Opened in a new tab from the pen icon (top left). ?service=<id> jumps to that service.

export default function PremiumPage() {
  const [searchParams] = useSearchParams();
  const [askMollyFor, setAskMollyFor] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'task-molly providers | Premium packages';
    const id = searchParams.get('service');
    if (id) document.getElementById(`premium-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  const jumpTo = (id: string) =>
    document.getElementById(`premium-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-[100dvh] pt-24 md:pt-28 pb-20 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent-gold mb-2">task-molly providers</p>
        <h1 className="text-3xl md:text-4xl font-light text-rich-black">Premium packages</h1>
        <p className="text-sm text-rich-black/60 mt-2 max-w-2xl">
          Monthly plans for every service we provide. Pick a package and tap Ask Molly to get started.
        </p>
      </div>

      {/* Jump to a service */}
      <div className="sticky top-16 md:top-20 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-6 bg-primary-bg/90 backdrop-blur-sm border-b border-warm-gray/60">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PREMIUM_PACKAGES.map((p) => (
            <button
              key={p.service.id}
              onClick={() => jumpTo(p.service.id)}
              className="shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold hover:text-rich-black"
            >
              {p.service.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {PREMIUM_PACKAGES.map((p, i) => (
          <motion.section
            key={p.service.id}
            id={`premium-${p.service.id}`}
            className="scroll-mt-40"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(i, 2) * 0.05 }}
          >
            <PackageRow pkg={p} onAskMolly={() => setAskMollyFor(p.service.id)} />
          </motion.section>
        ))}
      </div>

      <AnimatePresence>
        {askMollyFor && (
          <TaskRequestModal initialService={askMollyFor} onClose={() => setAskMollyFor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PackageRow({ pkg, onAskMolly }: { pkg: PremiumPackage; onAskMolly: () => void }) {
  const Icon = pkg.service.IconComponent;
  const total = packageTotal(pkg);
  return (
    <div className="bg-white border border-warm-gray rounded-3xl p-4 md:p-5 grid gap-4 md:gap-5 md:grid-cols-[190px_minmax(0,1fr)_minmax(0,340px)] items-stretch">
      {/* Column 1: the service is the profile */}
      <div className="flex md:flex-col items-center md:items-stretch gap-4">
        <div className="shrink-0 w-24 h-24 md:w-full md:h-auto md:aspect-square rounded-2xl bg-[#FFFBEB] border border-accent-gold/30 flex items-center justify-center">
          <Icon size={96} className="w-16 h-16 md:w-28 md:h-28" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-rich-black leading-tight">{pkg.title}</h2>
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold text-accent-gold mt-1.5">
            <Crown size={12} /> Premium
          </p>
          <p className="text-xs text-rich-black/50 mt-1.5 leading-snug">{pkg.tagline}</p>
        </div>
      </div>

      {/* Column 2: poster in task-molly colours */}
      <PackagePoster pkg={pkg} />

      {/* Column 3: services and monthly charges, then Ask Molly */}
      <div className="rounded-2xl border border-accent-gold/40 bg-primary-bg/60 p-4 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-gold mb-3">What's included</p>
        <ul className="space-y-2.5 flex-1">
          {pkg.items.map((item) => (
            <li key={item.name} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-rich-black/80 leading-snug">{item.name}</span>
              <span className="shrink-0 text-right font-bold text-rich-black tabular-nums">
                {formatKes(item.monthly)}
                {item.monthly > 0 && <span className="block text-[9px] font-medium text-rich-black/40">per month</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-accent-gold/30 flex items-baseline justify-between">
          <span className="text-xs font-bold text-rich-black">Full package</span>
          <span className="text-right">
            <span className="text-base font-black text-rich-black tabular-nums">{formatKes(total)}</span>
            <span className="text-[10px] text-rich-black/50"> / month</span>
          </span>
        </div>
        <button
          onClick={onAskMolly}
          className="mt-3 w-full py-3 rounded-xl bg-rich-black hover:bg-black text-white text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
        >
          <Send size={14} className="text-accent-gold" />
          Ask Molly
        </button>
      </div>
    </div>
  );
}

function PackagePoster({ pkg }: { pkg: PremiumPackage }) {
  const Icon = pkg.service.IconComponent;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-rich-black text-white p-5 md:p-6 min-h-[220px] flex flex-col">
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-accent-gold/25 blur-2xl" />
      <div className="absolute -right-6 -bottom-10 w-44 h-44 rounded-full border-[10px] border-accent-gold/20" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-gold font-bold">{pkg.title}</p>
          <h3 className="text-2xl md:text-3xl font-light leading-tight mt-2">{pkg.headline}</h3>
        </div>
        <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#FFFBEB] flex items-center justify-center ring-4 ring-accent-gold/40">
          <Icon size={48} />
        </div>
      </div>

      <ul className="relative mt-auto pt-5 flex flex-wrap gap-2">
        {pkg.highlights.map((h) => (
          <li key={h} className="flex items-center gap-1 text-[11px] bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
            <BadgeCheck size={12} className="text-accent-gold" /> {h}
          </li>
        ))}
      </ul>

      <div className="relative mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
        <span className="text-white/50">Monthly plan</span>
        <span>
          <span className="font-semibold text-white">task-</span>
          <span className="font-light text-accent-gold">molly</span>
        </span>
      </div>
    </div>
  );
}
