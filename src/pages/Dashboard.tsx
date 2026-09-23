import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { Calendar, Clock, MapPin, CreditCard, LogOut, ChevronRight, MessageSquare, TriangleAlert, CheckCircle, Package, Plus, Activity, Zap, Droplet, Wrench, Hammer, Paintbrush, Leaf, Shield, Wind, Layout, Bug, Truck, Briefcase, Sparkles, WashingMachine, User } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import ServiceTrackingDetail from '../components/ServiceTrackingDetail';
import ForumSidebar from '../components/ForumSidebar';
import ComplaintModal from '../components/ComplaintModal';
import TaskerAssignmentModal from '../components/TaskerAssignmentModal';
import ManageRequestModal from '../components/ManageRequestModal';
import CreateRequestModal from '../components/CreateRequestModal';
import AIModal from '../components/AIModal';
import EditProfileModal from '../components/EditProfileModal';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

const QUICK_SERVICES = [
  { id: 'electrical', label: 'Electrical', icon: Zap },
  { id: 'plumbing', label: 'Plumbing', icon: Droplet },
  { id: 'fundi', label: 'Fundi', icon: Wrench },
  { id: 'cleaning', label: 'Cleaning', icon: Sparkles },
  { id: 'mama_fua', label: 'Mama Fua', icon: WashingMachine },
  { id: 'moving', label: 'Movers', icon: Truck },
];

import { useDeviceType } from '../hooks/useDeviceType';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<any>(null);
  const [showForum, setShowForum] = useState(false);
  const [complaintJob, setComplaintJob] = useState<any>(null);
  const [assigningTask, setAssigningTask] = useState<any>(null);
  const [realJobs, setRealJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'syncing' | 'done'>('idle');
  const [pendingRequestInfo, setPendingRequestInfo] = useState<any>(null);
  const [managedRequest, setManagedRequest] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedServiceForCreate, setSelectedServiceForCreate] = useState<string | undefined>();
  const [onlineProviders, setOnlineProviders] = useState<any[]>([]);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(new Set());

  const getServiceIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    const size = isPhone ? 20 : 24;
    if (t.includes('electr')) return <Zap size={size} />;
    if (t.includes('plumb') || t.includes('water')) return <Droplet size={size} />;
    if (t.includes('clean') || t.includes('wash') || t.includes('laundry') || t.includes('mama fua')) return <WashingMachine size={size} />;
    if (t.includes('mechanic') || t.includes('car') || t.includes('auto')) return <Wrench size={size} />;
    if (t.includes('repair') || t.includes('handyman') || t.includes('fix')) return <Hammer size={size} />;
    if (t.includes('paint')) return <Paintbrush size={size} />;
    if (t.includes('garden') || t.includes('grass')) return <Leaf size={size} />;
    if (t.includes('security') || t.includes('guard')) return <Shield size={size} />;
    if (t.includes('ac') || t.includes('air') || t.includes('cool')) return <Wind size={size} />;
    if (t.includes('furniture') || t.includes('mount')) return <Layout size={size} />;
    if (t.includes('pest') || t.includes('bug')) return <Bug size={size} />;
    if (t.includes('move') || t.includes('delivery')) return <Truck size={size} />;
    if (t.includes('beauty') || t.includes('salon')) return <Sparkles size={size} />;
    return <Briefcase size={size} />;
  };

  const [pastProviders, setPastProviders] = useState<any[]>([]);
  const [debugForceShow, setDebugForceShow] = useState(false);
  const isDevUser = user?.uid?.startsWith('dev_');

  // Load pending request info for display
  useEffect(() => {
    const data = sessionStorage.getItem('pending_service_request');
    if (data) {
      try {
        setPendingRequestInfo(JSON.parse(data));
      } catch (e) {
        setPendingRequestInfo(null);
      }
    } else {
      setPendingRequestInfo(null);
    }
  }, [syncStatus, isSyncing]);

  // Debugging user data visibility
  useEffect(() => {
    if (user.uid) {
      console.log(`[Dashboard Debug] Current User UID: ${user.uid}`);
      console.log(`[Dashboard Debug] Current User Role: ${user.role}`);
      console.log(`[Dashboard Debug] Total Real Jobs Found: ${realJobs.length}`);
    }
  }, [user.uid, realJobs.length]);

  const finalizePendingRequest = async () => {
    if (isSyncing || syncStatus !== 'idle') return;
    
    const pendingData = sessionStorage.getItem('pending_service_request');
    if (pendingData && user.uid) {
      setSyncStatus('checking');
      console.log(`[Dashboard Sync Log] Found pending data. UID: ${user.uid}. Checking for duplicates...`);
      try {
        const request = JSON.parse(pendingData);
        
        // Final check for duplicates in the current list
        // This is critical to prevent infinite loops if the snapshot is slow
        const isDuplicate = realJobs.some(j => {
          if (request.syncId && j.syncId === request.syncId) return true;
          return j.serviceType?.toLowerCase() === (request.serviceType || request.service)?.toLowerCase() && 
                 Math.abs(new Date(j.createdAt).getTime() - Date.now()) < 600000; // 10 min window
        });

        if (isDuplicate) {
          console.log("[Dashboard Sync Log] Duplicate found in realJobs. Clearing session storage.");
          sessionStorage.removeItem('pending_service_request');
          setSyncStatus('done');
          return;
        }

        console.log("[Dashboard Sync Log] No duplicate found. Triggering API call...");
        setSyncStatus('syncing');
        toast.info("Finalizing your concierge request...", { id: 'finalizing-task' });
        setIsSyncing(true);
        
        const res = await fetch('/api/service-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: user.uid,
            clientName: user.displayName || 'Client',
            ...request
          })
        });

        const resData = await res.json().catch(() => ({}));
        console.log("[Dashboard Sync Log] API Status:", res.status, "Response:", resData);

        if (res.ok) {
          console.log("[Dashboard Sync Log] Success! ID:", resData.id);
          sessionStorage.removeItem('pending_service_request');
          toast.success("Task created from concierge consultation!", { id: 'finalizing-task' });
          
          setSyncStatus('done');
          // We keep isSyncing true for a bit longer to let Firestore catch up
          setTimeout(() => {
            setIsSyncing(false);
          }, 5000);
        } else {
          console.error("[Dashboard Sync Log] API error:", resData);
          if (res.status === 400 || res.status === 409) {
            console.log("[Dashboard Sync Log] Critical error or conflict. Clearing storage.");
            sessionStorage.removeItem('pending_service_request');
          }
          const errorMsg = resData.message || resData.error || 'Server error';
          toast.error(`Sync failed: ${errorMsg}`, { id: 'finalizing-task' });
          setIsSyncing(false);
          setSyncStatus('idle');
        }
      } catch (err) {
        console.error("[Dashboard Sync Log] Exception:", err);
        setIsSyncing(false);
        setSyncStatus('idle');
      }
    }
  };

  useEffect(() => {
    if (!user.uid) return;
    
    const checkAndSync = () => {
      if (sessionStorage.getItem('pending_service_request') && !isSyncing && syncStatus === 'idle') {
        console.log("[Dashboard Sync Log] Pending request detected on mount/update. Triggering sync.");
        finalizePendingRequest();
      }
    };

    checkAndSync();
    
    // Polling fallback to ensure we catch it if it was added late
    const interval = setInterval(checkAndSync, 8000);
    return () => clearInterval(interval);
  }, [user.uid, realJobs.length, isSyncing, syncStatus]);

  useEffect(() => {
    if (!user.uid) {
      setLoading(false);
      return;
    }

    // For real users, we wait for auth. For dev users, we proceed (though Firestore may fail perms)
    if (!auth.currentUser && !user.uid.startsWith('dev_')) return;

    // Fetch past providers from completed jobs
    const qCompleted = query(
      collection(db, 'serviceRequests'),
      where('clientId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsubscribePast = onSnapshot(qCompleted, (snapshot) => {
      const providersMap = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.providerId && data.providerName) {
          providersMap.set(data.providerId, {
            id: data.providerId,
            name: data.providerName,
            photo: data.providerPhoto || `https://picsum.photos/seed/${data.providerId}/200`
          });
        }
      });
      setPastProviders(Array.from(providersMap.values()));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'serviceRequests/completed');
    });

    return () => unsubscribePast();
  }, [user.uid]);

  // Fetch online providers
  useEffect(() => {
    if (!auth.currentUser) return;
    const qOnline = query(
      collection(db, 'users'),
      where('role', '==', 'tasker'),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(qOnline, (snapshot) => {
      const providers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().name || doc.data().displayName || 'Provider',
        photo: doc.data().photo || doc.data().photoURL || `https://picsum.photos/seed/${doc.id}/200`
      }));
      setOnlineProviders(providers);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users/online-taskers');
    });

    return () => unsubscribe();
  }, []);

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

    console.log(`[Dashboard] Starting listener for user: ${user.uid}`);
    const q = query(
      collection(db, 'serviceRequests'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Dashboard Sync Log] Snapshot received: ${snapshot.size} docs for ${user.uid}`);
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      
      const jobs = snapshot.docs.map(doc => {
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
        const isExpired = data.status === 'pending' && data.createdAt && diff > threeHoursInMs;

        return {
          id: doc.id,
          status: data.status,
          ...data,
          service: data.serviceType || data.service || 'General Service',
          price: data.clientPrice || data.budget || 0,
          date: createdAt.toLocaleDateString(),
          createdAt: createdAt,
          isExpired
        };
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setRealJobs(jobs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'serviceRequests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleLogout = async () => {
    console.log("[Dashboard] Logging out...");
    try {
      localStorage.removeItem('taskmolly_mock_user');
      await signOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = '/';
    }
  };
  
   const handleCancelTask = async (taskId: string) => {
    console.log(`[Dashboard] 🗑️ Initiating cancellation for TaskID: ${taskId}`);
    try {
      // Direct removal from state list as well as optimistic set
      setOptimisticHiddenIds(prev => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      
      // Immediately filter it out from the current realJobs view
      setRealJobs(prev => prev.filter(j => j.id !== taskId));
      
      setManagedRequest(null);
      if (activeJob?.id === taskId) setActiveJob(null);

      const res = await fetch(`/api/cancel-service-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, clientId: user.uid })
      });
      
      if (res.ok) {
        console.log(`[Dashboard] ✅ Cancellation API success for TaskID: ${taskId}`);
        toast.success("Request cancelled and removed");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error(`[Dashboard] ❌ Cancellation API failed for TaskID: ${taskId}:`, data);
        toast.error(data.error || "Failed to cancel request");
        // Re-show if failed (though realistically if it's already deleted in local state, it'll come back on next snapshot if it still exists in DB)
      }
    } catch (err) {
      console.error("[Dashboard] ❌ Cancel error caught:", err);
      toast.error("An error occurred");
    }
  };

  const handleAssignProvider = async (taskId: string, providerId: string) => {
    try {
      const res = await fetch('/api/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, providerId })
      });

      if (res.ok) {
        toast.success("Provider assigned successfully!");
        setActiveJob(null);
      } else {
        toast.error("Failed to assign provider");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("An error occurred");
    }
  };

  const ongoingJobs = realJobs.filter(j => 
    !optimisticHiddenIds.has(j.id) && 
    (j.status === 'pending' || j.status === 'assigned' || j.status === 'in-progress')
  );
  const completedJobs = realJobs.filter(j => 
    !optimisticHiddenIds.has(j.id) && 
    j.status === 'completed'
  );

  // Clear sync bubble if it matches a deleted taskId
  useEffect(() => {
    if (pendingRequestInfo && optimisticHiddenIds.has('pending')) {
      setSyncStatus('done');
      setIsSyncing(false);
      setPendingRequestInfo(null);
    }
  }, [optimisticHiddenIds, pendingRequestInfo]);

  const OngoingServiceBubble = ({ job }: { job: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-warm-gray rounded-[1.5rem] md:rounded-[2rem] overflow-hidden gold-hover shadow-sm transition-all"
      >
        <div 
          className="p-4 md:p-7 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-6">
            {/* Service & Context */}
            <div className="flex items-start gap-4 md:gap-5 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-primary-bg rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 border border-warm-gray/50 shadow-inner">
                <div className="text-accent-gold md:scale-125">
                  {getServiceIcon(job.service)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2 flex-wrap">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-accent-gold bg-accent-gold/5 px-2 py-0.5 md:py-1 rounded-md border border-accent-gold/10">
                    {job.service}
                  </span>
                  <span className={`text-[9px] md:text-[10px] uppercase tracking-widest px-2 py-0.5 md:py-1 rounded-md font-extrabold ${
                    job.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    job.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
                  <h3 className="text-base md:text-2xl font-light text-rich-black leading-tight mb-2">
                    <span className="font-bold text-accent-gold block text-[10px] md:text-sm mb-0.5 md:mb-1 uppercase tracking-tighter">
                      WORK CONTEXT:
                    </span>
                    {job.description ? (
                      job.description.length > 50 ? `${job.description.substring(0, 50)}...` : job.description
                    ) : "Service requested via Concierge"}
                  </h3>
                <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-2">
                  <p className="text-[10px] md:text-[11px] text-rich-black/50 font-bold uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                    <Clock size={isPhone ? 12 : 14} className="text-accent-gold/60" />
                    {job.deadline || 'Flexible'}
                  </p>
                  <p className="text-[10px] md:text-[11px] text-rich-black/50 font-bold uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                    <Calendar size={isPhone ? 12 : 14} className="text-accent-gold/60" />
                    {job.date}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Price & Primary Action */}
            <div className="flex items-center justify-between lg:justify-end gap-4 md:gap-6 border-t lg:border-t-0 border-warm-gray/30 pt-4 lg:pt-0">
              <div className="text-left lg:text-right">
                <p className="text-[9px] uppercase font-bold tracking-widest text-rich-black/30 mb-0.5 md:mb-1">Quote Estimate</p>
                <div className="flex items-baseline gap-1 lg:justify-end">
                  <span className="text-[10px] md:text-xs font-bold text-rich-black/40">KES</span>
                  <span className="text-xl md:text-3xl font-bold text-rich-black tabular-nums">{job.price?.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setManagedRequest(job);
                  }}
                  className="hidden md:flex bg-rich-black text-accent-gold px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Manage
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full border border-warm-gray hover:border-accent-gold transition-all ${isExpanded ? 'bg-rich-black text-white' : 'bg-white text-rich-black'}`}
                >
                  <Plus size={isPhone ? 18 : 20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-warm-gray/10"
            >
              <div className="p-6 md:p-8 bg-primary-bg/10 space-y-8">
                {/* Full Context */}
                <div className="bg-white p-6 rounded-3xl border border-warm-gray/50 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold mb-3 flex items-center gap-2">
                    <MessageSquare size={12} />
                    Detailed Request Context
                  </p>
                  <p className="text-base text-rich-black/80 font-light leading-relaxed italic">
                    "{job.description || 'No additional details provided during the consultation.'}"
                  </p>
                </div>

                {/* Status Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-3">Management</p>
                    {job.status === 'pending' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center animate-pulse">
                            <Clock size={18} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-700">Finding the perfect Pro</p>
                            <p className="text-[10px] text-amber-600 uppercase tracking-wide">Syncing with tasker pool...</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            disabled={optimisticHiddenIds.has(job.id)}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (window.confirm("Cancel this service request?")) {
                                handleCancelTask(job.id); 
                              }
                            }}
                            className={`flex-1 py-3 border border-red-100 text-red-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all ${optimisticHiddenIds.has(job.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {optimisticHiddenIds.has(job.id) ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-warm-gray/30 shadow-sm">
                        <img src={job.providerPhoto || `https://picsum.photos/seed/${job.providerId}/100`} alt={job.providerName} className="w-14 h-14 rounded-full object-cover border-2 border-accent-gold p-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-rich-black">{job.providerName}</p>
                          <p className="text-xs text-green-600 font-medium">Assigned & Ready</p>
                        </div>
                        <button 
                          onClick={() => setActiveJob(job)}
                          className="px-4 py-2 bg-rich-black text-accent-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                        >
                          Track Pro
                        </button>
                      </div>
                    )}
                  </div>

                  {pastProviders.length > 0 && job.status === 'pending' && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-3">Quick Assign</p>
                      <div className="flex flex-wrap gap-2">
                        {pastProviders.slice(0, 3).map(pro => (
                          <button 
                            key={pro.id}
                            onClick={() => handleAssignProvider(job.id, pro.id)}
                            className="flex items-center gap-2 p-2 pr-4 bg-white border border-warm-gray rounded-full hover:border-accent-gold transition-all group shadow-sm"
                          >
                            <img src={pro.photo} alt={pro.name} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-[10px] font-extrabold text-rich-black uppercase tracking-tight">{pro.name.split(' ')[0]}</span>
                            <Plus size={14} className="text-accent-gold" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-warm-gray/20">
                  <button 
                    onClick={() => setActiveJob(job)}
                    className="w-full py-4 bg-rich-black text-accent-gold rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-accent-gold/10 transition-all flex items-center justify-center gap-3"
                  >
                    View Comprehensive Summary
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-primary-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-primary-bg overflow-hidden flex flex-col items-center justify-start pt-20 md:pt-28 pb-4 relative px-4 md:px-6">
      {/* Decorative ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-accent-gold/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center justify-center text-center relative z-10 flex-1 my-auto">
        {/* Profile icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-2 md:mb-3 group shrink-0"
        >
          <div className="absolute inset-0 rounded-full bg-accent-gold/10 blur-md group-hover:scale-105 transition-all duration-300" />
          <img 
            src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200`} 
            alt={user.displayName || 'User'} 
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-accent-gold p-1 shadow-2xl object-cover hover:scale-[1.02] transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Welcome Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="mb-4 md:mb-6 shrink-0"
        >
          <h1 className="text-2xl md:text-3xl font-black text-rich-black tracking-tighter">
            Habari, <span className="text-accent-gold">{user.displayName?.split(' ')[0]}!</span>
          </h1>
          <p className="text-[11px] md:text-xs text-rich-black/40 font-semibold tracking-tight mt-0.5">
            How can we help you today?
          </p>
        </motion.div>

        {/* Floating Bubble with 4 Action Buttons */}
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
          {/* Edit Profile */}
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-primary-bg hover:bg-accent-gold/5 border border-warm-gray/50 rounded-xl group transition-all duration-300 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-warm-gray text-accent-gold shadow-sm group-hover:bg-accent-gold/10 group-hover:border-accent-gold/30 transition-all shrink-0">
                <User size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rich-black/70 group-hover:text-rich-black transition-colors text-left">Edit Profile</span>
            </div>
            <ChevronRight size={14} className="text-rich-black/30 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Tasks */}
          <button
            onClick={() => navigate('/tasks')}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-primary-bg hover:bg-accent-gold/5 border border-warm-gray/50 rounded-xl group transition-all duration-300 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-warm-gray text-accent-gold shadow-sm group-hover:bg-accent-gold/10 group-hover:border-accent-gold/30 transition-all shrink-0">
                <Briefcase size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rich-black/70 group-hover:text-rich-black transition-colors text-left">Tasks & Requests</span>
            </div>
            <ChevronRight size={14} className="text-rich-black/30 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Open Forum */}
          <button
            onClick={() => navigate('/blog')}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-primary-bg hover:bg-accent-gold/5 border border-warm-gray/50 rounded-xl group transition-all duration-300 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-warm-gray text-accent-gold shadow-sm group-hover:bg-accent-gold/10 group-hover:border-accent-gold/30 transition-all shrink-0">
                <MessageSquare size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rich-black/70 group-hover:text-rich-black transition-colors text-left">Open Forum</span>
            </div>
            <ChevronRight size={14} className="text-rich-black/30 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Log out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2.5 md:p-3 bg-red-50/10 hover:bg-red-50/40 border border-red-100 rounded-xl group transition-all duration-300 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-red-100 text-red-500 shadow-sm group-hover:bg-red-100/50 transition-all shrink-0">
                <LogOut size={15} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-red-600/80 group-hover:text-red-600 transition-colors text-left font-bold">Log out</span>
            </div>
            <ChevronRight size={14} className="text-red-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </motion.div>
      </div>

      {/* Edit Profile Modal Component */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        user={user}
      />
    </div>
  );
}
