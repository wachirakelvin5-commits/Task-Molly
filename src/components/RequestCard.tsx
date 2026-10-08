import { ReactNode } from 'react';
import { Briefcase, Clock, Droplet, Hammer, MapPin, Sparkles, Truck, Zap } from 'lucide-react';
import { RequestStatus, STATUS_LABELS, getServiceCategory, toDate } from '../lib/serviceRequests';

const CATEGORY_ICONS: Record<string, typeof Briefcase> = {
  'Cleaning & Domestic': Sparkles,
  'Plumbing & Water': Droplet,
  'Electrical & Solar': Zap,
  'Repairs & Fundi': Hammer,
  'Outdoor & Relocation': Truck,
};

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'in-progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'awaiting-confirmation': 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-neutral-100 text-rich-black/70 border-warm-gray',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

interface RequestCardProps {
  request: any;
  /** Which price to show: what the client pays or what the provider earns. */
  priceField: 'clientPrice' | 'providerPrice';
  /** Overrides the status badge text, e.g. "Expired". */
  badge?: string;
  /** One-line explanation of where the request stands and what happens next. */
  note?: ReactNode;
  children?: ReactNode;
}

export default function RequestCard({ request, priceField, badge, note, children }: RequestCardProps) {
  const category = request.serviceCategory || getServiceCategory(request.serviceType);
  const Icon = CATEGORY_ICONS[category] || Briefcase;
  const status = (request.status || 'pending') as RequestStatus;
  const posted = toDate(request.createdAt);
  const price = request[priceField] ?? request.budget;

  return (
    <div
      data-testid="request-card"
      data-status={status}
      className="bg-white border border-warm-gray hover:border-accent-gold/50 rounded-[1.75rem] p-5 shadow-sm transition-all flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center text-accent-gold border border-warm-gray/60 shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent-gold block">{category}</span>
          <h3 className="text-sm font-bold text-rich-black leading-snug break-words">{request.serviceType || 'Service request'}</h3>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${badge ? 'bg-neutral-100 text-rich-black/50 border-warm-gray' : STATUS_STYLES[status]}`}>
          {badge || STATUS_LABELS[status] || status}
        </span>
      </div>

      {request.description && (
        <p className="text-xs text-rich-black/70 line-clamp-3 italic leading-relaxed">"{request.description}"</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px] text-rich-black/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={12} className="text-accent-gold shrink-0" />
          <span className="truncate">{request.location || 'Nairobi'}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock size={12} className="text-accent-gold shrink-0" />
          <span className="truncate">{request.scheduledTime || request.urgency || 'ASAP'}</span>
        </div>
        <div className="font-black text-rich-black">{price ? `KES ${Number(price).toLocaleString()}` : 'Price TBC'}</div>
        <div className="text-right text-rich-black/40">{posted ? `Posted ${posted.toLocaleDateString()}` : 'Posting…'}</div>
      </div>

      {note && (
        <div className="text-xs text-rich-black/80 bg-primary-bg/70 border border-warm-gray/60 rounded-2xl px-3 py-2.5 leading-relaxed">
          {note}
        </div>
      )}

      {children && <div className="flex flex-wrap gap-2 pt-1">{children}</div>}
    </div>
  );
}

const BUTTON_STYLES = {
  primary: 'bg-rich-black hover:bg-black text-accent-gold border-rich-black',
  secondary: 'bg-white hover:bg-neutral-50 text-rich-black border-warm-gray hover:border-accent-gold',
  danger: 'bg-white hover:bg-red-50 text-red-600 border-red-200',
};

export function CardButton({
  onClick,
  disabled,
  variant = 'secondary',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON_STYLES;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl border text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_STYLES[variant]}`}
    >
      {children}
    </button>
  );
}
