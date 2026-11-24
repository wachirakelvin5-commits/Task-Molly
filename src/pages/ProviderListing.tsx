import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, BadgeCheck, Send } from 'lucide-react';
import { PROVIDER_LIST_SERVICES, findService, ServiceItem } from '../data/serviceCatalog';
import { SAMPLE_PROVIDERS, SampleProvider, posterHeadline, formatKes } from '../data/sampleProviders';
import TaskRequestModal from '../components/TaskRequestModal';

// The task-molly provider list: opened from the pen icon (top left) with ?service=<service id>.
// For now every profile is a SAMPLE (see src/data/sampleProviders.ts) and is labelled as one.

export default function ProviderListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const service: ServiceItem =
    PROVIDER_LIST_SERVICES.find((s) => s === findService(searchParams.get('service'))) || PROVIDER_LIST_SERVICES[0];
  const providers = SAMPLE_PROVIDERS[service.id] || [];
  const [askMollyFor, setAskMollyFor] = useState<string | null>(null);

  return (
    <div className="min-h-[100dvh] pt-24 md:pt-28 pb-20 px-4 md:px-6 max-w-6xl mx-auto">
      {/* Service picker */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 -mx-1 px-1">
        {PROVIDER_LIST_SERVICES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSearchParams({ service: s.id })}
            className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              s.id === service.id
                ? 'bg-rich-black text-white border-rich-black'
                : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent-gold mb-2">task-molly providers</p>
          <h1 className="text-3xl md:text-4xl font-light text-rich-black">{service.name}</h1>
        </div>
        <p className="text-xs text-rich-black/50 max-w-sm">
          These are sample profiles to show how providers will appear. Real, verified providers are coming soon.
        </p>
      </div>

      <div className="space-y-6">
        {providers.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <ProviderRow provider={p} service={service} onAskMolly={() => setAskMollyFor(service.id)} />
          </motion.div>
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

function ProviderRow({ provider: p, service, onAskMolly }: { provider: SampleProvider; service: ServiceItem; onAskMolly: () => void }) {
  return (
    <div className="bg-white border border-warm-gray rounded-3xl p-4 md:p-5 grid gap-4 md:gap-5 md:grid-cols-[190px_minmax(0,1fr)_minmax(0,320px)] items-stretch">
      {/* Column 1: profile photo */}
      <div className="flex md:flex-col items-center md:items-stretch gap-4">
        <div className="relative shrink-0 w-24 h-24 md:w-full md:h-auto md:aspect-square rounded-2xl overflow-hidden bg-accent-gold/15 border border-warm-gray">
          {/* Initials show if the photo can't load */}
          <span aria-hidden className="absolute inset-0 flex items-center justify-center text-2xl md:text-4xl font-light text-accent-gold">
            {p.name.split(' ').map((w) => w[0]).join('')}
          </span>
          <img
            src={p.photo}
            alt={`${p.name} (sample profile)`}
            className="relative w-full h-full object-cover text-[0px]"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/90 text-rich-black/70 px-1.5 py-0.5 rounded">
            Sample profile
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-rich-black leading-tight">{p.name}</h3>
          <div className="flex items-center gap-1 text-accent-gold mt-1">
            <Star size={13} fill="currentColor" />
            <span className="text-sm font-semibold">{p.rating.toFixed(1)}</span>
            <span className="text-xs text-rich-black/40 ml-1">· {p.jobsDone} jobs</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-rich-black/50 mt-1">
            <MapPin size={12} /> {p.area} · {p.yearsExperience} yrs
          </div>
        </div>
      </div>

      {/* Column 2: poster for this provider's service, in task-molly colours */}
      <ProviderPoster provider={p} service={service} />

      {/* Column 3: premium services & prices, then Ask Molly */}
      <div className="rounded-2xl border border-accent-gold/40 bg-primary-bg/60 p-4 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-gold mb-3">Premium services</p>
        <ul className="space-y-2.5 flex-1">
          {p.premium.map((item) => (
            <li key={item.name} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-rich-black/80 leading-snug">{item.name}</span>
              <span className="shrink-0 text-right font-bold text-rich-black tabular-nums">
                {formatKes(item.price)}
                {item.unit && <span className="block text-[9px] font-medium text-rich-black/40">{item.unit}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[9px] text-rich-black/40 mt-3">Example prices. Final price is agreed before the job.</p>
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

function ProviderPoster({ provider: p, service }: { provider: SampleProvider; service: ServiceItem }) {
  const Icon = service.IconComponent;
  const firstName = p.name.split(' ')[0];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-rich-black text-white p-5 md:p-6 min-h-[220px] flex flex-col">
      {/* Gold glow and rings */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-accent-gold/25 blur-2xl" />
      <div className="absolute -right-6 -bottom-10 w-44 h-44 rounded-full border-[10px] border-accent-gold/20" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-gold font-bold">{service.name}</p>
          <h4 className="text-2xl md:text-3xl font-light leading-tight mt-2">{posterHeadline(service.id)}</h4>
          <p className="text-xs text-white/60 mt-2">{p.tagline}</p>
        </div>
        <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#FFFBEB] flex items-center justify-center ring-4 ring-accent-gold/40">
          <Icon size={48} />
        </div>
      </div>

      <ul className="relative mt-auto pt-5 flex flex-wrap gap-2">
        {p.highlights.map((h) => (
          <li key={h} className="flex items-center gap-1 text-[11px] bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
            <BadgeCheck size={12} className="text-accent-gold" /> {h}
          </li>
        ))}
      </ul>

      <div className="relative mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
        <span className="text-white/50">with {firstName}</span>
        <span>
          <span className="font-semibold text-white">task-</span>
          <span className="font-light text-accent-gold">molly</span>
        </span>
      </div>
    </div>
  );
}
