import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  Wallet, 
  Star, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  LogOut, 
  MapPin, 
  Phone,
  DollarSign,
  MessageSquare,
  TriangleAlert,
  Activity,
  Package
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProviderTaskModal from '../components/ProviderTaskModal';
import ForumSidebar from '../components/ForumSidebar';
import ComplaintModal from '../components/ComplaintModal';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';

import { useDeviceType } from '../hooks/useDeviceType';

interface ProviderDashboardProps {
  user: UserProfile;
}

export default function ProviderDashboard({ user }: ProviderDashboardProps) {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const navigate = useNavigate();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskMode, setTaskMode] = useState<'accept' | 'manage'>('accept');
  const [showForum, setShowForum] = useState(false);
  const [complaintTask, setComplaintTask] = useState<any>(null);
  
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [proProfile, setProProfile] = useState<any>(null);
  const [ignoredTaskIds, setIgnoredTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`ignored_tasks_${user.uid}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(user.isOnline || false);

  useEffect(() => {
    if (!user.uid) return;
    
    // For real users, we wait for auth. For dev users, we proceed
    if (!auth.currentUser && !user.uid.startsWith('dev_')) return;
    
    // Sync online status with Firestore when component mounts
    const syncOnlineStatus = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { isOnline: true });
        setIsOnline(true);
      } catch (err) {
        console.error("Error syncing online status:", err);
      }
    };
    
    syncOnlineStatus();

    return () => {
      // Best effort set offline on unmount
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { isOnline: false }).catch(() => {});
    };
  }, [user.uid]);

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isOnline: newStatus });
      setIsOnline(newStatus);
      toast.success(`You are now ${newStatus ? 'Online' : 'Offline'}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    if (!user.uid) {
      setLoading(false);
      return;
    }

    // Faster loading for mock/dev users
    if (!auth.currentUser && !user.uid.startsWith('dev_')) {
      const timeout = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timeout);
    } else if (user.uid.startsWith('dev_')) {
      // Mock users don't need to wait for auth state
      setLoading(false);
    }

    // Fetch pro profile to get categories
    const fetchProProfile = async () => {
      try {
        const docRef = doc(db, 'taskerProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProProfile(docSnap.data());
        } else {
          // Fallback: if no specific profile exists, maybe it's in the user doc?
          // For now we'll assume it exists or use an empty array
          setProProfile({ serviceCategories: [] });
        }
      } catch (err) {
        console.error("Error fetching pro profile:", err);
      }
    };

    fetchProProfile();

    // 1. Fetch Available (Pending) Tasks
    const qPending = query(
      collection(db, 'serviceRequests'),
      where('status', '==', 'pending')
    );

    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;

      const tasks = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let createdAt: Date;
          
          if (data.createdAt && typeof data.createdAt.toDate === "function") {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = now;
          }

          const diff = now.getTime() - createdAt.getTime();
          const isExpired = diff > threeHoursInMs;

          return {
            id: doc.id,
            ...data,
            service: data.serviceType,
            price: data.providerPrice || 0,
            createdAt: createdAt,
            isExpired,
            time: data.urgency === "Emergency" ? "ASAP" : "Scheduled"
          };
        })
        .filter(t => {
          // Filter by pro's categories if profiles are loaded
          const matchesCategory = proProfile?.serviceCategories?.length > 0 
            ? proProfile.serviceCategories.some((cat: string) => t.service?.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(t.service?.toLowerCase()))
            : true; // Default to true if profile not yet loaded or empty for now (to avoid hiding everything)
            
          return !ignoredTaskIds.includes(t.id) && !t.isExpired && matchesCategory;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAvailableTasks(tasks);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'serviceRequests/pending');
      toast.error("Error loading available tasks");
    });

    // Fetch Active Tasks for this Provider
    const qActive = query(
      collection(db, 'serviceRequests'),
      where('status', 'in', ['assigned', 'in-progress']),
      where('providerId', '==', user.uid)
    );

    const unsubActive = onSnapshot(qActive, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        service: doc.data().serviceType,
        price: doc.data().providerPrice || 0,
        distance: 'Local'
      }));
      setActiveTasks(jobs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'serviceRequests/active');
      setLoading(false);
    });

    return () => {
      unsubPending();
      unsubActive();
    };
  }, [user.uid, proProfile]);

  const handleAcceptTask = async (task: any) => {
    try {
      const taskRef = doc(db, 'serviceRequests', task.id);
      await updateDoc(taskRef, {
        status: 'assigned',
        providerId: user.uid,
        providerName: user.displayName,
        acceptedAt: new Date().toISOString()
      });
      toast.success("Task accepted! Redirecting to chat...");
      setSelectedTask(null);
    } catch (err) {
      console.error("Error accepting task:", err);
      toast.error("Failed to accept task");
    }
  };

  const handleDeclineTask = (task: any) => {
    const newIgnored = [...ignoredTaskIds, task.id];
    setIgnoredTaskIds(newIgnored);
    localStorage.setItem(`ignored_tasks_${user.uid}`, JSON.stringify(newIgnored));
    setAvailableTasks(prev => prev.filter(t => t.id !== task.id));
    toast.info("Task declined.");
    setSelectedTask(null);
  };

  const handleCompleteTask = async (task: any) => {
    try {
      const taskRef = doc(db, 'serviceRequests', task.id);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      toast.success("Task marked as completed!");
      setSelectedTask(null);
    } catch (err) {
      console.error("Error completing task:", err);
      toast.error("Failed to update status");
    }
  };

   const handleCancelTask = async (task: any) => {
    if (!window.confirm("Are you sure you want to cancel this task? This may impact your pro rating.")) return;
    
    try {
      // Optimistic update
      setActiveTasks(prev => prev.filter(t => t.id !== task.id));
      setSelectedTask(null);

      const res = await fetch(`/api/cancel-service-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, clientId: user.uid })
      });
      
      if (res.ok) {
        toast.success("Task cancelled successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to cancel task");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("An error occurred");
    }
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

  const handleWithdraw = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      toast.success(`KES ${user.walletBalance || 4500} withdrawn to M-Pesa number ${user.phone || '07xx xxx xxx'}`);
      setIsWithdrawing(false);
    }, 2000);
  };

  const COMPLETED_TASKS = [
    { id: '50', service: 'Electrician', clientId: 'client_50', client: 'David O.', date: 'Apr 18, 2026', rating: 5, price: 3000 },
    { id: '48', service: 'Electrician', clientId: 'client_48', client: 'Mercy C.', date: 'Apr 15, 2026', rating: 4.8, price: 6500 },
    { id: '45', service: 'Electrician', clientId: 'client_45', client: 'John K.', date: 'Apr 10, 2026', rating: 5, price: 2500 },
  ];

  const overallRating = 4.9;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-primary-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] bg-primary-bg flex ${isPhone ? 'pt-20' : 'pt-24 md:pt-32'}`}>
      <div className="flex-1 px-4 md:px-6 max-w-[1400px] mx-auto w-full">
        <div className={`flex flex-col lg:flex-row gap-8 lg:gap-12 pb-20`}>
          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white border border-warm-gray rounded-3xl p-6 md:p-8 shadow-sm lg:sticky lg:top-32">
              <div className="text-center mb-6 md:mb-8">
                <img 
                  src={user.photoURL || 'https://via.placeholder.com/150'} 
                  alt={user.displayName || 'Pro'} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto mb-3 md:mb-4 border-2 border-accent-gold p-1 object-cover"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-xl md:text-2xl font-light mb-1">{user.displayName}</h2>
                <div className="flex items-center justify-center gap-1 text-accent-gold mb-4">
                  <Star size={14} className="md:w-4 md:h-4" fill="currentColor" />
                  <span className="text-sm md:text-base font-bold">{overallRating}</span>
                  <span className="text-[10px] md:text-xs text-rich-black/40 ml-1">(124 reviews)</span>
                </div>

                {/* Online Status Toggle */}
                <div className="flex items-center justify-between p-3 bg-primary-bg rounded-2xl border border-warm-gray mb-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-rich-black/20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rich-black/60">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <button 
                    onClick={toggleOnlineStatus}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isOnline ? 'bg-accent-gold' : 'bg-warm-gray'}`}
                  >
                    <motion.div 
                      animate={{ x: isOnline ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>

              {/* Wallet Section */}
              <div className="bg-primary-bg rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-warm-gray">
                <div className="flex items-center gap-2 text-rich-black/40 text-[10px] md:text-xs uppercase tracking-widest mb-2">
                  <Wallet size={12} className="md:w-3.5 md:h-3.5" />
                  <span>E-Wallet Balance</span>
                </div>
                <div className="text-xl md:text-2xl font-light mb-3 md:mb-4">
                  <span className="mr-1">KES</span>
                  {user.walletBalance || '4,500'}
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="w-full py-2.5 md:py-3 bg-rich-black text-white rounded-xl text-xs md:text-sm font-medium hover:bg-rich-black/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <ArrowUpRight size={14} className="md:w-4 md:h-4" />
                      Withdraw to M-Pesa
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 md:space-y-3">
                <button className="w-full py-2.5 md:py-3 border border-warm-gray rounded-full text-xs md:text-sm font-medium hover:border-accent-gold transition-colors">
                  Manage Services
                </button>
                <button 
                  onClick={() => setShowForum(!showForum)}
                  className={`w-full lg:hidden py-2.5 md:py-3 flex items-center justify-center gap-2 border rounded-full text-xs md:text-sm font-medium transition-all ${
                    showForum ? 'bg-accent-gold text-white border-accent-gold' : 'border-warm-gray text-rich-black hover:border-accent-gold'
                  }`}
                >
                  <MessageSquare size={14} />
                  {showForum ? 'Close Forum' : 'Open Forum'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full py-2.5 md:py-3 flex items-center justify-center gap-2 text-red-500 text-xs md:text-sm font-medium hover:bg-red-50 rounded-full transition-colors"
                >
                  <LogOut size={14} className="md:w-4 md:h-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6 md:mb-12">
              <h1 className="text-xl md:text-2xl font-light mb-2">Pro <span className="text-accent-gold">Dashboard</span></h1>
              <p className="text-sm md:text-base text-rich-black/60">Find new tasks and track your earnings.</p>
            </div>

            {/* Available Tasks */}
            <section className="mb-8 md:mb-12">
              <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6 flex items-center flex-wrap gap-2">
                Available <span className="text-accent-gold">Tasks</span>
                <span className="bg-accent-gold/10 text-accent-gold text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap">{availableTasks.length} New</span>
              </h2>
              <div className="grid gap-4">
                {availableTasks.length > 0 ? availableTasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-warm-gray rounded-2xl md:rounded-[2rem] p-5 md:p-8 hover:border-accent-gold transition-all group relative overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h3 className="text-lg md:text-2xl font-bold text-rich-black truncate">{task.service}</h3>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={10} className="text-accent-gold md:w-3" />
                              <span className="text-[10px] md:text-xs text-rich-black/60 font-medium">{task.location}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={10} className="text-accent-gold md:w-3" />
                              <span className="text-[9px] md:text-[10px] text-accent-gold font-bold">Deadline: {task.deadline || 'Flexible'}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-primary-bg px-2 md:px-3 py-1 rounded-full text-rich-black/40 shrink-0">
                          {task.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="bg-primary-bg/50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-warm-gray/50 flex items-center gap-2">
                          <DollarSign size={12} className="text-accent-gold md:w-3.5" />
                          <span className="text-xs md:text-sm font-bold text-rich-black">KES {task.price}</span>
                        </div>
                        <div className="bg-accent-gold/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-accent-gold/10 flex items-center gap-2">
                          <Clock size={12} className="text-accent-gold md:w-3.5" />
                          <span className="text-[10px] md:text-xs font-bold text-accent-gold">{task.urgency}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] md:text-sm text-rich-black/50 leading-relaxed mb-5 md:mb-6 border-l-2 border-warm-gray/50 pl-3 md:pl-4">
                      {task.description}
                    </p>

                    <button 
                      onClick={() => {
                        setTaskMode('accept');
                        setSelectedTask(task);
                      }}
                      className="w-full bg-rich-black text-white py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-rich-black/90 transition-all shadow-lg shadow-rich-black/10 active:scale-[0.98]"
                    >
                      View & Accept Task
                    </button>
                  </motion.div>
                )) : (
                  <div className="bg-primary-bg/50 border border-dashed border-warm-gray rounded-[2rem] p-12 text-center">
                    <Package className="mx-auto w-12 h-12 text-rich-black/10 mb-4" />
                    <p className="text-sm text-rich-black/40 italic">No available tasks in your area right now.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Active Tasks */}
            <section className="mb-8 md:mb-12">
              <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6 flex items-center flex-wrap gap-2">
                Ongoing <span className="text-accent-gold">Work</span>
                <span className="bg-accent-gold/10 text-accent-gold text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap">{activeTasks.length} Active</span>
              </h2>
              <div className="grid gap-4">
                {activeTasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-accent-gold/20 rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <div className="min-w-0 pr-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-lg md:text-2xl font-bold text-rich-black truncate">{task.service}</h3>
                          <span className="flex items-center gap-1 bg-green-50 text-green-600 text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest w-fit">
                            <Activity size={10} className="animate-pulse" />
                            In Progress
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[10px] md:text-xs text-rich-black/40 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-accent-gold md:w-3" />
                            {task.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={10} className="text-accent-gold md:w-3" />
                            KES {task.price}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setComplaintTask({ id: task.id, targetId: task.clientId })}
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-rich-black/20 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-warm-gray/50 shrink-0"
                        title="Report Client"
                      >
                        <TriangleAlert size={isPhone ? 16 : 18} />
                      </button>
                    </div>

                    <p className="text-[11px] md:text-sm text-rich-black/60 leading-relaxed mb-6 md:mb-8 line-clamp-2 md:line-clamp-none">
                      {task.description}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-4 md:pt-6 border-t border-warm-gray/50">
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-rich-black/20 mb-0.5 md:mb-1">Session Active</p>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-rich-black">
                          <Clock size={10} className="text-accent-gold md:w-3" />
                          {task.acceptedAt ? `${Math.floor((new Date().getTime() - new Date(task.acceptedAt).getTime()) / 60000)} mins ago` : 'just now'}
                        </div>
                      </div>
                      <div className="flex w-full sm:w-auto gap-2 md:gap-3">
                        <button 
                          onClick={() => navigate(`/chat/${task.id}`)}
                          className="flex-1 sm:flex-initial bg-primary-bg text-rich-black px-4 md:px-6 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-warm-gray/20 transition-all border border-warm-gray"
                        >
                          <MessageSquare size={isPhone ? 14 : 16} className="inline mr-1.5 md:mr-2" />
                          Chat
                        </button>
                        <button 
                          onClick={() => {
                            setTaskMode('manage');
                            setSelectedTask(task);
                          }}
                          className="flex-1 sm:flex-initial bg-rich-black text-white px-5 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-rich-black/90 transition-all shadow-xl shadow-rich-black/10 active:scale-[0.98]"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Completed Tasks & Ratings */}
            <section>
              <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6">Completed <span className="text-accent-gold">Earnings</span></h2>
              <div className="bg-white border border-warm-gray rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-primary-bg border-b border-warm-gray">
                      <tr>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium">Service</th>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium">Client</th>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium">Date</th>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium text-center">Rating</th>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium text-right">Action</th>
                        <th className="px-4 md:px-8 py-3 md:py-4 text-[10px] md:text-xs uppercase tracking-widest text-rich-black/40 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-gray">
                      {COMPLETED_TASKS.map((task) => (
                        <tr key={task.id} className="hover:bg-primary-bg/30 transition-colors">
                          <td className="px-4 md:px-8 py-4 md:py-6 text-sm md:text-base font-medium">{task.service}</td>
                          <td className="px-4 md:px-8 py-4 md:py-6 text-sm md:text-base text-rich-black/60">{task.client}</td>
                          <td className="px-4 md:px-8 py-4 md:py-6 text-rich-black/40 text-xs md:text-sm">{task.date}</td>
                          <td className="px-4 md:px-8 py-4 md:py-6">
                            <div className="flex items-center justify-center gap-1 text-accent-gold">
                              <Star size={12} className="md:w-3.5 md:h-3.5" fill="currentColor" />
                              <span className="text-xs md:text-sm font-bold">{task.rating}</span>
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                            <button 
                              onClick={() => setComplaintTask({ id: task.id, targetId: task.clientId })}
                              className="p-2 text-rich-black/20 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            >
                              <TriangleAlert size={16} />
                            </button>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-6 text-right text-sm md:text-base font-medium text-green-600">KES {task.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>

          {/* Forum Sidebar - Right */}
          <aside className={`fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-warm-gray transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
            showForum ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}>
            <div className="h-full pt-16 lg:pt-0">
               <ForumSidebar />
            </div>
          </aside>
        </div>
      </div>
      
      {/* Mobile Forum Toggle Overlay */}
      {showForum && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowForum(false)}
        />
      )}

      <AnimatePresence>
        {selectedTask && (
          <ProviderTaskModal 
            task={selectedTask}
            mode={taskMode}
            onClose={() => setSelectedTask(null)}
            onDecline={() => handleDeclineTask(selectedTask)}
            onAccept={() => handleAcceptTask(selectedTask)}
            onComplete={() => handleCompleteTask(selectedTask)}
            onCancel={() => handleCancelTask(selectedTask)}
          />
        )}
      </AnimatePresence>

      <ComplaintModal
        isOpen={!!complaintTask}
        onClose={() => setComplaintTask(null)}
        taskId={complaintTask?.id || ''}
        reporterId={user.uid}
        reporterRole="tasker"
        targetId={complaintTask?.targetId || ''}
      />
    </div>
  );
}
