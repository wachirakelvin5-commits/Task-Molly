import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  Star, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  MapPin, 
  MessageCircle, 
  PhoneCall 
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ServiceTrackingDetailProps {
  job: {
    id: string;
    service: string;
    status: string;
    date: string;
    pro: {
      name: string;
      rating: number;
      photo: string;
      reviews?: number;
    };
    price: number;
    assignedAt: string;
  };
  onBack: () => void;
}

export default function ServiceTrackingDetail({ job, onBack }: ServiceTrackingDetailProps) {
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const assigned = new Date(job.assignedAt).getTime();
      const now = new Date().getTime();
      const diffInMs = now - assigned;
      
      const hours = Math.floor(diffInMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m`);
      } else {
        setElapsedTime(`${minutes}m`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [job.assignedAt]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white min-h-[60vh] rounded-[2.5rem] border border-warm-gray overflow-hidden shadow-sm flex flex-col"
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-warm-gray flex items-center justify-between bg-primary-bg/30">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white rounded-full transition-colors flex items-center gap-2 text-rich-black/60 hover:text-rich-black"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent-gold rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-accent-gold">Live Tracking</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 space-y-8">
        {/* Service Title */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-4xl font-light mb-2">{job.service}</h1>
          <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-rich-black/40">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>Assigned {job.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} />
              <span>Nairobi</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-primary-bg/50 p-6 rounded-3xl border border-warm-gray flex flex-col items-center justify-center text-center">
            <Clock className="text-accent-gold mb-3" size={24} />
            <span className="text-[10px] uppercase tracking-widest text-rich-black/40 mb-1">Time Elapsed</span>
            <span className="text-xl font-medium">{elapsedTime}</span>
          </div>
          <div className="bg-primary-bg/50 p-6 rounded-3xl border border-warm-gray flex flex-col items-center justify-center text-center">
            <DollarSign className="text-accent-gold mb-3" size={24} />
            <span className="text-[10px] uppercase tracking-widest text-rich-black/40 mb-1">Total Cost</span>
            <span className="text-xl font-medium">KES {job.price}</span>
          </div>
        </div>

        {/* Provider Profile */}
        <div className="bg-white border border-warm-gray rounded-[2.5rem] p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {job.pro ? (
              <>
                <img 
                  src={job.pro.photo} 
                  alt={job.pro.name} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-accent-gold p-1 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <h3 className="text-xl md:text-2xl font-medium">{job.pro.name}</h3>
                    <ShieldCheck size={18} className="text-blue-500" fill="currentColor" />
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                    <div className="flex items-center gap-1 text-accent-gold">
                      <Star size={16} fill="currentColor" />
                      <span className="text-sm font-bold">{job.pro.rating}</span>
                    </div>
                    <span className="text-xs text-rich-black/40">({job.pro.reviews || 124} Reviews)</span>
                    <span className="w-1 h-1 bg-warm-gray rounded-full" />
                    <span className="text-xs text-rich-black/60 font-medium">Top Rated Pro</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-rich-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-rich-black/90 transition-all">
                      <PhoneCall size={14} />
                      Call
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-warm-gray rounded-full text-xs font-bold uppercase tracking-widest hover:border-accent-gold transition-all">
                      <MessageCircle size={14} />
                      Message
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 text-center py-4">
                <div className="w-12 h-12 bg-accent-gold/10 text-accent-gold rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-medium mb-2">Finding the right Pro...</h3>
                <p className="text-sm text-rich-black/40">We've notified 5 top-rated Taskers nearby.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-6 bg-primary-bg/10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rich-black/30">
          Task Molly Secure Execution • Nairobi, KE
        </p>
      </div>
    </motion.div>
  );
}
