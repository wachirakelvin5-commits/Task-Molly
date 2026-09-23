import { motion } from 'motion/react';
import { 
  X, 
  MapPin, 
  Clock, 
  DollarSign, 
  Navigation, 
  FileText 
} from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';

interface TaskAcceptanceModalProps {
  task: {
    id: string;
    service: string;
    location: string;
    price: number;
    time: string;
    description: string;
    urgency: string;
    distance: string;
    acceptedAt?: string;
  };
  mode?: 'accept' | 'manage';
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export default function TaskAcceptanceModal({ 
  task, 
  mode = 'accept', 
  onAccept, 
  onDecline, 
  onComplete, 
  onCancel,
  onClose 
}: TaskAcceptanceModalProps) {
  const { isPhone } = useDeviceType();

  const canCancel = () => {
    if (!task.acceptedAt) return false;
    const acceptedTime = new Date(task.acceptedAt).getTime();
    const currentTime = new Date().getTime();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    return (currentTime - acceptedTime) < thirtyMinutesInMs;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-rich-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col w-full max-w-2xl ${
          isPhone ? 'h-[90vh]' : 'max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-warm-gray flex items-center justify-between bg-primary-bg/30">
          <h2 className="text-xl md:text-2xl font-light text-accent-gold">
            {mode === 'accept' ? 'Task Details' : 'Manage Ongoing Task'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-rich-black/20 hover:text-rich-black"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
          {/* Main Info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-medium mb-4">{task.service}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-primary-bg/50 p-4 rounded-2xl border border-warm-gray flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-accent-gold shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rich-black/40 mb-0">Amount Offered</p>
                  <p className="text-base font-bold mb-0">KES {task.price}</p>
                </div>
              </div>
              <div className="bg-primary-bg/50 p-4 rounded-2xl border border-warm-gray flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-accent-gold shadow-sm">
                  <Navigation size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-rich-black/40 mb-0">Distance</p>
                  <p className="text-base font-bold mb-0">{task.distance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rich-black/40">
              <MapPin size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Location: {task.location}</span>
            </div>
            
            <div className="bg-primary-bg/20 p-6 rounded-3xl border border-dashed border-warm-gray">
              <div className="flex items-center gap-2 mb-3 text-rich-black/40">
                <Clock size={16} className="text-accent-gold" />
                <span className="text-xs font-bold uppercase tracking-widest">Urgency: {task.urgency}</span>
              </div>
              <div className="text-sm md:text-base text-rich-black/70 leading-relaxed font-normal">
                {task.description}
              </div>
            </div>
          </div>

          {/* Verification / Security info */}
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <Clock size={16} />
            </div>
            <p className="text-[10px] text-green-800 font-medium leading-tight mb-0">
              Customer identity verified. Funds are held in escrow for your protection.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 bg-white border-t border-warm-gray">
          {mode === 'accept' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={onDecline}
                className="py-4 rounded-full border border-warm-gray text-xs font-bold uppercase tracking-widest hover:bg-primary-bg transition-all order-2 sm:order-1"
              >
                Turn down task
              </button>
              <button 
                onClick={onAccept}
                className="py-4 rounded-full bg-rich-black text-white text-xs font-bold uppercase tracking-widest hover:bg-rich-black/90 transition-all shadow-xl shadow-rich-black/10 order-1 sm:order-2"
              >
                Accept task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canCancel() && (
                <button 
                  onClick={onCancel}
                  className="py-4 rounded-full border border-red-200 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all order-2 sm:order-1"
                >
                  Cancel task
                </button>
              )}
              <button 
                onClick={onComplete}
                className={`py-4 rounded-full bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-600/10 order-1 sm:order-2 ${!canCancel() ? 'sm:col-span-2' : ''}`}
              >
                Complete task
              </button>
            </div>
          )}
          <p className="text-center mt-6 text-[8px] font-bold uppercase tracking-[0.3em] text-rich-black/20 mb-0">
            Task Molly Secure Platform • Nairobi, KE
          </p>
        </div>
      </motion.div>
    </div>
  );
}
