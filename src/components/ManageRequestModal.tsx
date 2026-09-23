import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, MapPin, DollarSign, User, ShieldCheck, AlertCircle, Trash2, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ManageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  pastProviders: any[];
  onlineProviders?: any[];
  onCancel: (id: string) => Promise<void>;
  onAssign: (req: any, proId?: string) => void;
}

export default function ManageRequestModal({ isOpen, onClose, request, pastProviders, onlineProviders = [], onCancel, onAssign }: ManageRequestModalProps) {
  const [expiryTime, setExpiryTime] = useState<string>('');
  const [targetStartTime, setTargetStartTime] = useState<string>('');
  const [activeAssignTab, setActiveAssignTab] = useState<'past' | 'online'>('past');

  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!request) return;
    setIsCancelling(false);

    try {
      // Improved time extraction logic
      const extractTime = (str: string | undefined): string | null => {
        if (!str) return null;
        // Match formats like "11:00 AM", "11am", "11:00am", "11 PM", "14:00"
        const timeMatch = str.match(/(\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm|\b))/i);
        // Clean up if it just matched numbers without AM/PM
        if (timeMatch && !/[a-z]/i.test(timeMatch[0]) && timeMatch[0].includes(':')) {
           return timeMatch[0].trim();
        }
        return timeMatch ? timeMatch[0].toUpperCase().trim() : null;
      };

      const rawTime = request.time || request.preferredTime || request.deadline;
      const extracted = extractTime(rawTime);
      const timeStr = extracted || "12:00 PM";
      const displayTime = extracted ? extracted : (rawTime && rawTime.length < 20 ? rawTime : "Flexible");
      
      const dateStr = request.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      setTargetStartTime(displayTime);

      // Try to parse the full date and time for expiry calculation
      const fullDateStr = `${dateStr} ${timeStr}`;
      let targetDate = new Date(fullDateStr);
      
      // If parsing failed with custom format, try current date with extracted time
      if (isNaN(targetDate.getTime())) {
        const todayStr = new Date().toLocaleDateString('en-US');
        targetDate = new Date(`${todayStr} ${timeStr}`);
      }

      if (!isNaN(targetDate.getTime())) {
        const expiryDate = new Date(targetDate.getTime() - 30 * 60 * 1000); // 30 mins before
        setExpiryTime(expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        const createdAt = request.createdAt ? new Date(request.createdAt) : new Date();
        const fallbackExpiry = new Date(createdAt.getTime() + 120 * 60 * 1000);
        setExpiryTime(fallbackExpiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      setExpiryTime('30 mins before start');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const isSyncing = request.syncStatus && request.syncStatus !== 'done';
  const displayProviders = activeAssignTab === 'past' ? pastProviders : onlineProviders;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-rich-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-warm-gray"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-warm-gray flex items-center justify-between bg-primary-bg/10 relative">
            {isSyncing && (
              <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
                <motion.div 
                  animate={{ x: [-200, 500] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-48 h-full bg-accent-gold shadow-[0_0_10px_#FFC700]"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSyncing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Clock size={16} className="text-accent-gold" />
                  </motion.div>
                ) : <ShieldCheck size={16} className="text-accent-gold" />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rich-black/40">
                  {isSyncing ? 'Syncing with Network' : 'Request Management'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-rich-black tracking-tighter">
                {request.service || request.serviceType} <span className="text-accent-gold">Details</span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-full border border-warm-gray hover:border-accent-gold transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
            {/* Expiry Alert */}
            <div className={`rounded-3xl p-4 flex items-start gap-4 ${isSyncing ? 'bg-accent-gold/5 border border-accent-gold/20' : 'bg-amber-50 border border-amber-200'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSyncing ? 'bg-accent-gold/20' : 'bg-amber-200/50'}`}>
                <Clock size={20} className={isSyncing ? 'text-accent-gold' : 'text-amber-700'} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSyncing ? 'text-accent-gold' : 'text-amber-800/40'}`}>
                  {isSyncing ? 'Dynamic Sync Window' : 'Expiration window'}
                </p>
                <p className={`text-sm font-bold leading-tight ${isSyncing ? 'text-rich-black' : 'text-amber-900'}`}>
                  Starts @ <span className="text-accent-gold">{targetStartTime}</span>. Expires @ <span className="text-accent-gold">{expiryTime}</span>
                </p>
              </div>
            </div>

            {/* Provider Selection Categories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-rich-black/20">Assign Special Tasker</p>
                <div className="flex bg-primary-bg p-1 rounded-full border border-warm-gray/50">
                  <button 
                    onClick={() => setActiveAssignTab('past')}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${activeAssignTab === 'past' ? 'bg-white text-accent-gold shadow-sm' : 'text-rich-black/30'}`}
                  >
                    Past Pros
                  </button>
                  <button 
                    onClick={() => setActiveAssignTab('online')}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${activeAssignTab === 'online' ? 'bg-white text-accent-gold shadow-sm' : 'text-rich-black/30'}`}
                  >
                    Online Now
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {displayProviders.length > 0 ? (
                  displayProviders.slice(0, 4).map(pro => (
                    <button 
                      key={pro.id}
                      onClick={() => {
                        toast.success(`Assigning ${pro.name}...`);
                        onAssign(request, pro.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 bg-white border border-warm-gray rounded-2xl hover:border-accent-gold hover:bg-accent-gold/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={pro.photo} alt={pro.name} className="w-10 h-10 rounded-full object-cover border border-warm-gray" />
                          {pro.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-rich-black flex items-center gap-1.5">
                            {pro.name}
                            {pro.verified && <ShieldCheck size={12} className="text-accent-gold" />}
                          </p>
                          <p className="text-[10px] text-rich-black/40 font-medium">{pro.category || pro.service || 'Verified Tasker'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="text-right hidden sm:block">
                           <p className="text-[10px] font-bold text-accent-gold">{pro.rating || '4.9'} ★</p>
                           <p className="text-[8px] text-rich-black/30 uppercase font-black">Rating</p>
                         </div>
                         <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center text-rich-black/20 group-hover:bg-accent-gold group-hover:text-white transition-all">
                           <ChevronRight size={14} />
                         </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-warm-gray rounded-3xl">
                    <User size={24} className="mx-auto text-rich-black/10 mb-2" />
                    <p className="text-xs text-rich-black/30 font-medium">No {activeAssignTab === 'past' ? 'past pros available' : 'taskers online right now'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Request Summary Section */}
            <div className="p-5 bg-primary-bg/30 rounded-3xl border border-warm-gray/30">
              <p className="text-[9px] font-black uppercase tracking-widest text-rich-black/20 mb-2">Original Request</p>
              <p className="text-xs italic font-light text-rich-black/70 leading-relaxed mb-4">
                "{request.description || "Service requested via Concierge."}"
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rich-black/40">
                  <MapPin size={12} className="text-accent-gold" />
                  {request.location || 'Nairobi'}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rich-black/40">
                  <DollarSign size={12} className="text-accent-gold" />
                  KES {(request.price || request.budget || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 md:p-8 bg-primary-bg/5 border-t border-warm-gray flex flex-col sm:flex-row gap-3">
            <button 
              disabled={isCancelling}
              onClick={async () => {
                if (window.confirm("Are you sure you want to cancel this request? It will be removed from your dashboard.")) {
                  setIsCancelling(true);
                  try {
                    await onCancel(request.id || 'pending');
                    onClose();
                  } catch (e) {
                    setIsCancelling(false);
                  }
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 border border-red-100 text-red-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm ${isCancelling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCancelling ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : <Trash2 size={16} />}
              {isCancelling ? 'Cancelling...' : 'Cancel & Remove'}
            </button>
            <button 
              onClick={() => {
                onAssign(request);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rich-black text-accent-gold rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-accent-gold/10 transition-all active:scale-95 shadow-lg"
            >
              <AlertCircle size={16} />
              System Match
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
