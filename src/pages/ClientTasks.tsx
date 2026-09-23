import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { Calendar, Clock, ArrowLeft, Plus, ChevronRight, MessageSquare, TriangleAlert, CheckCircle, Activity, Zap, Droplet, Wrench, Hammer, Paintbrush, Leaf, Shield, Wind, Layout, Bug, Truck, Briefcase, Sparkles, WashingMachine } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate } from 'react-router-dom';
import ServiceTrackingDetail from '../components/ServiceTrackingDetail';
import ComplaintModal from '../components/ComplaintModal';
import TaskerAssignmentModal from '../components/TaskerAssignmentModal';
import ManageRequestModal from '../components/ManageRequestModal';
import CreateRequestModal from '../components/CreateRequestModal';
import AIModal from '../components/AIModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { useDeviceType } from '../hooks/useDeviceType';

interface ClientTasksProps {
  user: UserProfile;
}

export default function ClientTasks({ user }: ClientTasksProps) {
  const { isPhone } = useDeviceType();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<any>(null);
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
  const [selectedServiceForCreate, setSelectedServiceForCreate] = useState<string | undefined>();
  const [onlineProviders, setOnlineProviders] = useState<any[]>([]);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(new Set());
  const [pastProviders, setPastProviders] = useState<any[]>([]);

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

  const finalizePendingRequest = async () => {
    if (isSyncing || syncStatus !== 'idle') return;
    
    const pendingData = sessionStorage.getItem('pending_service_request');
    if (pendingData && user.uid) {
      setSyncStatus('checking');
      try {
        const request = JSON.parse(pendingData);
        
        const isDuplicate = realJobs.some(j => {
          if (request.syncId && j.syncId === request.syncId) return true;
          return j.serviceType?.toLowerCase() === (request.serviceType || request.service)?.toLowerCase() && 
                 Math.abs(new Date(j.createdAt).getTime() - Date.now()) < 600000;
        });

        if (isDuplicate) {
          sessionStorage.removeItem('pending_service_request');
          setSyncStatus('done');
          return;
        }

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

        if (res.ok) {
          sessionStorage.removeItem('pending_service_request');
          toast.success("Task created from concierge consultation!", { id: 'finalizing-task' });
          setSyncStatus('done');
          setTimeout(() => {
            setIsSyncing(false);
          }, 5000);
        } else {
          if (res.status === 400 || res.status === 409) {
            sessionStorage.removeItem('pending_service_request');
          }
          const errorMsg = resData.message || resData.error || 'Server error';
          toast.error(`Sync failed: ${errorMsg}`, { id: 'finalizing-task' });
          setIsSyncing(false);
          setSyncStatus('idle');
        }
      } catch (err) {
        console.error("Sync exception:", err);
        setIsSyncing(false);
        setSyncStatus('idle');
      }
    }
  };

  useEffect(() => {
    if (!user.uid) return;
    
    const checkAndSync = () => {
      if (sessionStorage.getItem('pending_service_request') && !isSyncing && syncStatus === 'idle') {
        finalizePendingRequest();
      }
    };

    checkAndSync();
    const interval = setInterval(checkAndSync, 8000);
    return () => clearInterval(interval);
  }, [user.uid, realJobs.length, isSyncing, syncStatus]);

  useEffect(() => {
    if (!user.uid) return;
    if (!auth.currentUser && !user.uid.startsWith('dev_')) return;

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

    if (!auth.currentUser && !user.uid.startsWith('dev_')) {
      const timeout = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timeout);
    } else if (user.uid.startsWith('dev_')) {
      setLoading(false);
    }

    const q = query(
      collection(db, 'serviceRequests'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
  
  const handleCancelTask = async (taskId: string) => {
    try {
      setOptimisticHiddenIds(prev => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      
      setRealJobs(prev => prev.filter(j => j.id !== taskId));
      setManagedRequest(null);
      if (activeJob?.id === taskId) setActiveJob(null);

      const res = await fetch(`/api/cancel-service-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, clientId: user.uid })
      });
      
      if (res.ok) {
        toast.success("Request cancelled and removed");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error("Cancel error caught:", err);
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
                    <Clock size={12} className="text-accent-gold/60" />
                    {job.deadline || 'Flexible'}
                  </p>
                  <p className="text-[10px] md:text-[11px] text-rich-black/50 font-bold uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                    <Calendar size={12} className="text-accent-gold/60" />
                    {job.date}
                  </p>
                </div>
              </div>
            </div>
            
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
                  <Plus size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
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
                <div className="bg-white p-6 rounded-3xl border border-warm-gray/50 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold mb-3 flex items-center gap-2">
                    <MessageSquare size={12} />
                    Detailed Request Context
                  </p>
                  <p className="text-base text-rich-black/80 font-light leading-relaxed italic">
                    "{job.description || 'No additional details provided during the consultation.'}"
                  </p>
                </div>

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
    <div className="min-h-[100dvh] bg-primary-bg pt-24 md:pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-6 w-full">
        {/* Back navigation & Page title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-12 border-b border-warm-gray/40 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-full border border-warm-gray hover:border-accent-gold transition-all shadow-sm active:scale-95 shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-accent-gold bg-accent-gold/5 px-2.5 py-1 rounded-md border border-accent-gold/10">Client Space</span>
              <h1 className="text-2xl md:text-4xl font-black text-rich-black tracking-tighter mt-1">
                Your <span className="text-accent-gold">Tasks</span> & Requests
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-rich-black text-accent-gold font-bold text-[10px] uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-accent-gold/10 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 md:self-end"
          >
            <Plus size={14} />
            New Service Request
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeJob ? (
            <ServiceTrackingDetail 
              key="tracking"
              job={activeJob} 
              onBack={() => setActiveJob(null)} 
            />
          ) : (
            <div className="space-y-12">
              {/* Sync Concierge Status Notification */}
              {syncStatus !== 'idle' && syncStatus !== 'done' && (
                <div
                  onClick={() => setManagedRequest({
                    ...pendingRequestInfo,
                    service: pendingRequestInfo?.serviceType || 'Concierge',
                    syncStatus
                  })}
                  className="bg-accent-gold/5 border border-accent-gold/20 rounded-[2rem] p-5 flex items-center justify-between shadow-lg shadow-accent-gold/5 cursor-pointer hover:bg-accent-gold/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-gold text-white rounded-full flex items-center justify-center shrink-0 shadow-lg relative">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {getServiceIcon(pendingRequestInfo?.serviceType || '')}
                      </motion.div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs md:text-sm font-bold text-accent-gold">
                          {syncStatus === 'checking' 
                            ? `Verifying Concierge: ${pendingRequestInfo?.serviceType}` 
                            : `Syncing with verified pros...`}
                        </p>
                      </div>
                      <p className="text-[10px] md:text-xs text-accent-gold/60 max-w-[180px] sm:max-w-md line-clamp-1 italic">
                        "{pendingRequestInfo?.description || 'Matching your job context'}"
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] text-accent-gold/60 uppercase tracking-widest font-black px-3 py-1 bg-white border border-accent-gold/15 rounded-full">
                    Synchronizing...
                  </span>
                </div>
              )}

              {/* Ongoing Services Section */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-xl font-bold text-rich-black">Ongoing Tasks</h2>
                  <span className="bg-accent-gold text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">{ongoingJobs.length}</span>
                </div>
                
                <div className="space-y-4">
                  {ongoingJobs.length > 0 ? ongoingJobs.map((job) => (
                    <OngoingServiceBubble key={job.id} job={job} />
                  )) : (
                    <div className="bg-white border border-dashed border-warm-gray rounded-3xl p-8 text-center shadow-inner">
                      <Activity className="mx-auto text-rich-black/20 mb-3" size={28} />
                      <p className="text-sm text-rich-black/40 font-medium italic">No ongoing services at the moment.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-4 py-2 border border-accent-gold/30 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-accent-gold hover:bg-accent-gold/5 transition-all"
                      >
                        Book a Service Now
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Past Services Section */}
              <section>
                <h2 className="text-xl font-bold text-rich-black mb-6">Service History</h2>
                
                <div className="space-y-4">
                  {completedJobs.length > 0 ? completedJobs.map((job, i) => (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white border border-warm-gray rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-accent-gold/30 transition-all group gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-green-50/50 rounded-2xl flex items-center justify-center shrink-0 relative">
                          <div className="text-green-700">
                            {getServiceIcon(job.service)}
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center border border-white">
                            <CheckCircle size={9} className="text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-rich-black truncate">{job.service}</h3>
                          <p className="text-xs text-rich-black/40 font-medium">Completed by {job.providerName || 'Verified Pro'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-warm-gray/30 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-bold text-rich-black">{job.date}</p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-green-600">KES {job.price?.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => setComplaintJob(job)}
                          className="w-10 h-10 flex items-center justify-center text-rich-black/20 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100 shadow-sm"
                          title="Report Issue"
                        >
                          <TriangleAlert size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="bg-white border border-warm-gray rounded-3xl p-8 text-center text-rich-black/30 italic font-medium">
                      Your completed services will show up here.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Complaint Modal */}
      <ComplaintModal
        isOpen={!!complaintJob}
        onClose={() => setComplaintJob(null)}
        taskId={complaintJob?.id || ''}
        reporterId={user.uid}
        reporterRole="client"
        targetId={complaintJob?.providerId || complaintJob?.pro?.id || ''}
      />

      <TaskerAssignmentModal
        isOpen={!!assigningTask}
        onClose={() => setAssigningTask(null)}
        taskId={assigningTask?.id || ''}
        onAssigned={() => {
          setAssigningTask(null);
        }}
      />

      <ManageRequestModal
        isOpen={!!managedRequest}
        onClose={() => setManagedRequest(null)}
        request={managedRequest}
        pastProviders={pastProviders}
        onlineProviders={onlineProviders}
        onCancel={async (id) => {
          if (id === 'pending') {
            sessionStorage.removeItem('pending_service_request');
            setSyncStatus('done');
            setIsSyncing(false);
            setPendingRequestInfo(null);
            toast.success("Pending request cleared");
          } else {
            await handleCancelTask(id);
          }
        }}
        onAssign={(req, proId) => {
          if (proId) {
            handleAssignProvider(req.id, proId);
          } else {
            setAssigningTask(req);
          }
        }}
      />

      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedServiceForCreate(undefined);
        }}
        userId={user.uid}
        userName={user.displayName || 'Client'}
        initialService={selectedServiceForCreate}
      />

      {showAIModal && (
        <AIModal onClose={() => setShowAIModal(false)} />
      )}
    </div>
  );
}
