import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TriangleAlert, X, Send, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface ComplaintModalProps {
  taskId: string;
  reporterId: string;
  reporterRole: 'client' | 'tasker';
  targetId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CLIENT_REASONS = [
  'Unsatisfactory Service',
  'Poor Hygiene',
  'Missing/Damaged Items'
];

const PROVIDER_REASONS = [
  'Abusive Customer',
  'False Task Details',
  'Security'
];

export default function ComplaintModal({ 
  taskId, 
  reporterId, 
  reporterRole, 
  targetId, 
  isOpen, 
  onClose 
}: ComplaintModalProps) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasons = reporterRole === 'client' ? CLIENT_REASONS : PROVIDER_REASONS;

  const handleSubmit = async () => {
    if (!reason || !comment) {
      toast.error('Please select a reason and provide a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        taskId,
        reporterId,
        reporterRole,
        targetId,
        reason,
        comment,
        status: 'new',
        timestamp: serverTimestamp()
      });

      toast.success('Complaint submitted to admin for review. Admin will reach out within 24 hours.', {
        duration: 5000
      });
      onClose();
    } catch (err) {
      console.error('Error submitting complaint:', err);
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-red-100"
          >
            {/* Header */}
            <div className="bg-red-50 p-8 flex items-center gap-4 border-b border-red-100">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-600 shadow-sm">
                <TriangleAlert size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900 tracking-tight">Raise a Complaint</h2>
                <p className="text-xs text-red-700/60 uppercase tracking-widest font-bold">Official Dispute Resolution</p>
              </div>
              <button 
                onClick={onClose}
                className="ml-auto w-10 h-10 flex items-center justify-center rounded-full hover:bg-white transition-colors text-red-900/40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Reason Selection */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-3 block">Reason For Complaint</label>
                <select 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-primary-bg border border-warm-gray rounded-xl py-3.5 px-4 focus:outline-none focus:border-red-500 transition-all font-medium text-sm"
                >
                  <option value="">Select a reason...</option>
                  {reasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Comment Field */}
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold block">Explain Situation</label>
                  <span className={`text-[10px] font-bold ${comment.length > 350 ? 'text-red-500' : 'text-rich-black/20'}`}>
                    {comment.length}/350
                  </span>
                </div>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={350}
                  rows={4}
                  placeholder="Tell us what happened..."
                  className="w-full bg-primary-bg border border-warm-gray rounded-xl py-3.5 px-4 focus:outline-none focus:border-red-500 transition-all font-medium text-sm resize-none"
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                <ShieldAlert className="text-amber-600 shrink-0" size={18} />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Complaints are taken seriously. False reporting may lead to account suspension. Admin will verify details against task logs.
                </p>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !reason || !comment}
                className="w-full bg-red-600 text-white py-4 rounded-full font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
