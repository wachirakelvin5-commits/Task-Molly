import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, MapPin, DollarSign, ShieldCheck, AlertCircle, Send, Zap, Droplet, Wrench, Hammer, Paintbrush, Leaf, Shield, Wind, Layout, Bug, Truck, Sparkles, WashingMachine } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  initialService?: string;
}

const SERVICE_ICONS: Record<string, any> = {
  'Electrical': Zap,
  'Plumbing': Droplet,
  'Carpenter': Hammer,
  'Painter': Paintbrush,
  'Fundi': Wrench,
  'Gardener': Leaf,
  'Security': Shield,
  'Internet / TV': Wind,
  'Appliance': Layout,
  'Pest Control': Bug,
  'Movers': Truck,
  'Cleaning': Sparkles,
  'Mama Fua': WashingMachine
};

const SERVICES = Object.keys(SERVICE_ICONS);

export default function CreateRequestModal({ isOpen, onClose, userId, userName, initialService }: CreateRequestModalProps) {
  const [service, setService] = useState(initialService || '');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('Nairobi');
  const [urgency, setUrgency] = useState<'Emergency' | 'ASAP' | 'Scheduled'>('ASAP');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialService) setService(initialService);
  }, [initialService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !description || !budget) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        clientId: userId,
        clientName: userName,
        serviceType: service,
        description,
        budget: Number(budget),
        clientPrice: Number(budget),
        providerPrice: Number(budget) * 0.85, // 15% commission
        location,
        urgency,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        syncStatus: 'done'
      };

      await addDoc(collection(db, 'serviceRequests'), requestData);
      toast.success("Request created successfully! Checking for matching pros...");
      onClose();
      // Reset form
      setService('');
      setDescription('');
      setBudget('');
    } catch (err) {
      console.error("Error creating request:", err);
      toast.error("Failed to create request. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
          <div className="p-6 md:p-8 border-b border-warm-gray flex items-center justify-between bg-primary-bg/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-accent-gold" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rich-black/40">Manual Booking</span>
              </div>
              <h2 className="text-2xl font-black text-rich-black tracking-tighter">
                Request a <span className="text-accent-gold">Pro</span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-full border border-warm-gray hover:border-accent-gold transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            {/* Service Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-rich-black/30 mb-2 block">What do you need?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICES.map(s => {
                  const Icon = SERVICE_ICONS[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setService(s)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        service === s 
                          ? 'bg-accent-gold/10 border-accent-gold text-accent-gold shadow-sm' 
                          : 'bg-white border-warm-gray text-rich-black/40 hover:border-accent-gold/50'
                      }`}
                    >
                      <Icon size={20} className="mb-1" />
                      <span className="text-[10px] font-bold text-center leading-tight">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-rich-black/30 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what needs to be done..."
                className="w-full p-4 bg-primary-bg/50 border border-warm-gray rounded-2xl text-sm focus:outline-none focus:border-accent-gold min-h-[100px] resize-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Budget */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-rich-black/30 mb-2 block">Your Budget (KES)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/20" size={16} />
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full pl-10 pr-4 py-3 bg-primary-bg/50 border border-warm-gray rounded-2xl text-sm focus:outline-none focus:border-accent-gold transition-all"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-rich-black/30 mb-2 block">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/20" size={16} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-primary-bg/50 border border-warm-gray rounded-2xl text-sm focus:outline-none focus:border-accent-gold transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-rich-black/30 mb-2 block">Urgency Status</label>
              <div className="flex gap-2">
                {['Emergency', 'ASAP', 'Scheduled'].map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u as any)}
                    className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                      urgency === u 
                        ? 'bg-rich-black text-accent-gold border-rich-black shadow-lg shadow-rich-black/20' 
                        : 'bg-white border-warm-gray text-rich-black/40 hover:border-accent-gold'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-6 md:p-8 bg-primary-bg/5 border-t border-warm-gray">
            <button 
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 py-4 bg-rich-black text-accent-gold rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-accent-gold/10 transition-all active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
              ) : <Send size={18} />}
              {isSubmitting ? 'Creating Request...' : 'Publish Request'}
            </button>
            <p className="text-[10px] text-center mt-4 text-rich-black/30 font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-accent-gold" />
              Your request will be synced with local verified pros
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
