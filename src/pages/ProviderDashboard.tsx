import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { 
  Wallet, 
  Star, 
  ArrowUpRight, 
  LogOut, 
  Briefcase,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';

interface ProviderDashboardProps {
  user: UserProfile;
}

export default function ProviderDashboard({ user }: ProviderDashboardProps) {
  const navigate = useNavigate();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Initialize online status from saved preference or user object
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const saved = localStorage.getItem(`provider_online_${user.uid}`);
    if (saved !== null) {
      return saved === 'true';
    }
    return user.isOnline ?? true;
  });

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    localStorage.setItem(`provider_online_${user.uid}`, String(newStatus));

    if (newStatus) {
      toast.success("You are now Online and receiving job requests!");
    } else {
      toast.info("You are now Offline. You will not receive new alerts.");
    }

    // Best-effort sync with Firestore
    try {
      if (user.uid) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { isOnline: newStatus });
      }
    } catch (err) {
      console.warn("Could not sync online status to Firestore (local session active):", err);
    }
  };

  const handleWithdraw = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      toast.success(`KES ${user.walletBalance || 4500} successfully withdrawn to M-Pesa ${user.phone || '07xx xxx xxx'}`);
      setIsWithdrawing(false);
    }, 1500);
  };

  const handleLogout = async () => {
    console.log("[ProviderDashboard] Logging out...");
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isOnline: false });
    } catch (e) {}
    
    try {
      localStorage.removeItem('taskmolly_mock_user');
      await signOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-primary-bg overflow-hidden flex flex-col items-center justify-start pt-20 md:pt-24 pb-4 px-4 md:px-6 relative">
      {/* Decorative ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-accent-gold/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center justify-center text-center relative z-10 flex-1 my-auto">
        {/* Profile Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-2 md:mb-3 group shrink-0"
        >
          <div className="absolute inset-0 rounded-full bg-accent-gold/10 blur-md group-hover:scale-105 transition-all duration-300" />
          <img 
            src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200`} 
            alt={user.displayName || 'Service Provider'} 
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-accent-gold p-1 shadow-2xl object-cover hover:scale-[1.02] transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Greeting & Rating */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="mb-2 shrink-0"
        >
          <h1 className="text-2xl md:text-3xl font-black text-rich-black tracking-tight">
            Habari, <span className="text-accent-gold">{user.displayName?.split(' ')[0] || 'Pro'}!</span>
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-accent-gold mt-1">
            <Star size={14} fill="currentColor" />
            <span className="text-xs font-bold text-rich-black">4.9</span>
            <span className="text-[10px] text-rich-black/40 font-semibold">(124 reviews)</span>
          </div>
        </motion.div>

        {/* Usable Online / Offline Toggle Button */}
        <div className="flex items-center justify-between w-full px-4 py-2.5 bg-white rounded-2xl border border-warm-gray mb-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-all ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rich-black/30'}`} />
            <span className={`text-xs font-black uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-rich-black/50'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button 
            onClick={toggleOnlineStatus}
            type="button"
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
              isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-gray-300'
            }`}
            title={isOnline ? 'Click to turn Offline' : 'Click to turn Online'}
          >
            <motion.div 
              animate={{ x: isOnline ? 26 : 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
            />
          </button>
        </div>

        {/* E-Wallet Balance Card */}
        <div className="w-full bg-white rounded-2xl p-3.5 border border-warm-gray mb-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-gold/10 text-accent-gold flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-widest text-rich-black/40 font-bold">E-Wallet Balance</p>
              <p className="text-base font-black text-rich-black">KES {user.walletBalance?.toLocaleString() || '4,500'}</p>
            </div>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="px-3.5 py-2 bg-rich-black text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer shadow-sm"
          >
            {isWithdrawing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ArrowUpRight size={13} className="text-accent-gold" />
                <span>Withdraw</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Bubble with Action Buttons - Ending at Log out */}
        <motion.div
          animate={{
            y: [0, -6, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-full bg-white border border-warm-gray rounded-[2rem] p-4 md:p-5 shadow-[0_15px_40px_rgba(212,175,55,0.06)] flex flex-col gap-2 border-accent-gold/15 shrink-0"
        >
          {/* Tasks & Requests -> Opens to Pro Workspace */}
          <button
            onClick={() => navigate('/provider-services')}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-primary-bg hover:bg-accent-gold/5 border border-warm-gray/50 rounded-xl group transition-all duration-300 active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-warm-gray text-accent-gold shadow-sm group-hover:bg-accent-gold/10 group-hover:border-accent-gold/30 transition-all shrink-0">
                <Briefcase size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rich-black/70 group-hover:text-rich-black transition-colors text-left">
                Tasks & Requests
              </span>
            </div>
            <ChevronRight size={14} className="text-rich-black/30 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Open Forum */}
          <button
            onClick={() => navigate('/blog')}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-primary-bg hover:bg-accent-gold/5 border border-warm-gray/50 rounded-xl group transition-all duration-300 active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-warm-gray text-accent-gold shadow-sm group-hover:bg-accent-gold/10 group-hover:border-accent-gold/30 transition-all shrink-0">
                <MessageSquare size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rich-black/70 group-hover:text-rich-black transition-colors text-left">
                Open Forum
              </span>
            </div>
            <ChevronRight size={14} className="text-rich-black/30 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Log out -> Ends here */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-red-50/10 hover:bg-red-50/40 border border-red-100 rounded-xl group transition-all duration-300 active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-red-100 text-red-500 shadow-sm group-hover:bg-red-100/50 transition-all shrink-0">
                <LogOut size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-red-600/80 group-hover:text-red-600 transition-colors text-left font-bold">
                Log out
              </span>
            </div>
            <ChevronRight size={14} className="text-red-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
