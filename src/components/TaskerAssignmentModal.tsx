import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShieldCheck, MapPin, UserCheck, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Tasker {
  uid: string;
  displayName: string;
  photoURL?: string;
  rating?: number;
  completedTasks?: number;
}

interface TaskerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onAssigned: () => void;
}

export default function TaskerAssignmentModal({ isOpen, onClose, taskId, onAssigned }: TaskerAssignmentModalProps) {
  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTaskers();
    }
  }, [isOpen]);

  const fetchTaskers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/live-providers');
      if (res.ok) {
        const data = await res.json();
        setTaskers(data);
      }
    } catch (err) {
      console.error("Failed to fetch taskers:", err);
      toast.error("Failed to load service providers");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (providerId: string) => {
    setAssigningId(providerId);
    try {
      const res = await fetch('/api/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, providerId })
      });

      if (res.ok) {
        toast.success("Task assigned successfully!");
        onAssigned();
        onClose();
      } else {
        toast.error("Failed to assign task");
      }
    } catch (err) {
      console.error("Assign error:", err);
      toast.error("An error occurred during assignment");
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-rich-black/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-warm-gray flex items-center justify-between bg-primary-bg/30">
          <div>
            <h2 className="text-2xl font-light mb-1">Live <span className="text-accent-gold">Professionals</span></h2>
            <p className="text-xs text-rich-black/40 font-medium tracking-widest uppercase">Select a pro to assign to your mission</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-warm-gray hover:border-accent-gold transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4 text-rich-black/40">
              <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Scanning local field...</p>
            </div>
          ) : taskers.length > 0 ? (
            taskers.map((tasker) => (
              <motion.div 
                key={tasker.uid}
                whileHover={{ y: -2 }}
                className="bg-primary-bg/50 border border-warm-gray rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-accent-gold/50 transition-all"
              >
                <img 
                  src={tasker.photoURL || `https://picsum.photos/seed/${tasker.uid}/200`} 
                  alt={tasker.displayName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h3 className="font-medium text-lg">{tasker.displayName}</h3>
                    <ShieldCheck size={16} className="text-blue-500" fill="currentColor" />
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                    <div className="flex items-center gap-1 text-accent-gold font-bold text-xs">
                      <Star size={14} fill="currentColor" />
                      {tasker.rating || 4.9}
                    </div>
                    <div className="flex items-center gap-1 text-rich-black/40 text-xs font-medium">
                      <MapPin size={14} />
                      Nairobi, KE
                    </div>
                    <div className="flex items-center gap-1 text-rich-black/40 text-xs font-medium">
                      <UserCheck size={14} />
                      {tasker.completedTasks || 124} Jobs
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAssign(tasker.uid)}
                    disabled={assigningId === tasker.uid}
                    className="w-full md:w-auto px-8 py-3 bg-rich-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-rich-black/90 transition-all shadow-lg shadow-rich-black/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assigningId === tasker.uid ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>Assign Mission <Search size={14} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-rich-black/40 italic">No professionals currently active in your sector.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-warm-gray bg-primary-bg/10 flex justify-center">
          <p className="text-[10px] text-rich-black/30 font-bold uppercase tracking-widest text-center">
            Only vettedTask Molly professionals are listed for instant assignment
          </p>
        </div>
      </motion.div>
    </div>
  );
}
