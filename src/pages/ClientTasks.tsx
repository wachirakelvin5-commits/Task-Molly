import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare, 
  TriangleAlert, 
  CheckCircle, 
  Activity, 
  Zap, 
  Droplet, 
  Wrench, 
  Hammer, 
  Paintbrush, 
  Leaf, 
  Shield, 
  Wind, 
  Layout, 
  Bug, 
  Truck, 
  Briefcase, 
  Sparkles, 
  WashingMachine,
  Download,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Star,
  Receipt,
  FileText
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate } from 'react-router-dom';
import ServiceTrackingDetail from '../components/ServiceTrackingDetail';
import ComplaintModal from '../components/ComplaintModal';
import TaskerAssignmentModal from '../components/TaskerAssignmentModal';
import ManageRequestModal from '../components/ManageRequestModal';
import CreateRequestModal from '../components/CreateRequestModal';
import AIModal from '../components/AIModal';
import ChatWithProModal from '../components/ChatWithProModal';
import ScheduleTimeModal from '../components/ScheduleTimeModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { useDeviceType } from '../hooks/useDeviceType';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getPendingRequest, finalizePendingRequest as syncPendingRequestService } from '../lib/pendingRequestService';

export interface SampleTaskItem {
  id: string;
  refCode: string;
  service: string;
  description: string;
  price: number;
  location: string;
  status: 'in-progress' | 'assigned' | 'pending';
  urgency: 'ASAP' | 'Scheduled';
  providerName: string;
  providerRole: string;
  providerPhoto: string;
  providerRating: number;
  date: string;
  time: string;
  mpesaReceipt: string;
}

// Helper to display full scheduled time e.g. "4th October, Sunday 4pm"
export function formatFullScheduledTime(dateStr?: string, timeStr?: string, customOverride?: string): string {
  if (customOverride && (customOverride.includes('Sunday') || customOverride.includes('Monday') || customOverride.includes('Tuesday') || customOverride.includes('Wednesday') || customOverride.includes('Thursday') || customOverride.includes('Friday') || customOverride.includes('Saturday') || customOverride.includes(','))) {
    return customOverride;
  }
  if (!dateStr) return '4th October, Sunday 4pm';

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  try {
    const dateToParse = dateStr.includes('2026') ? dateStr : `${dateStr}, 2026`;
    const parsedDate = new Date(dateToParse);
    if (!isNaN(parsedDate.getTime())) {
      const dayNum = parsedDate.getDate();
      const month = monthNames[parsedDate.getMonth()];
      const dayOfWeek = dayNames[parsedDate.getDay()];

      let formattedTime = '4pm';
      if (timeStr) {
        const clean = timeStr.trim();
        const match = clean.match(/(\d+):?(\d*)\s*(AM|PM|am|pm)?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = match[2] ? parseInt(match[2], 10) : 0;
          const ampm = (match[3] || 'pm').toLowerCase();
          if (minutes === 0) {
            formattedTime = `${hours}${ampm}`;
          } else {
            formattedTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes}${ampm}`;
          }
        } else {
          formattedTime = clean.toLowerCase();
        }
      }
      return `${getOrdinal(dayNum)} ${month}, ${dayOfWeek} ${formattedTime}`;
    }
  } catch {
    // Fallback if parsing fails
  }

  return `${dateStr} • ${timeStr || '4pm'}`;
}

// Helper to extract clean first name for pro e.g. "Grace Njeri" -> "Grace", "Eng. Paul Karanja" -> "Paul"
export function getProFirstName(name?: string): string {
  if (!name) return 'Pro';
  let clean = name.trim();
  clean = clean.replace(/^(Eng\.|Dr\.|Fundi|Mama)\s+/i, '');
  const parenMatch = clean.match(/\((.*?)\)/);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim().split(' ')[0];
    if (inside) return inside;
  }
  const parts = clean.split(' ');
  return parts[0] || 'Pro';
}

export const CLIENT_DEFAULT_LOCATION = 'Kilimani, Chania Ave';

export const TWELVE_SAMPLE_TASKS: SampleTaskItem[] = [
  {
    id: 'sample-task-1',
    refCode: 'TM-2026-9011',
    service: 'Mama Fua & Laundry Care',
    description: '3 baskets of delicates, bed linens wash & steam ironing',
    price: 1800,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'ASAP',
    providerName: 'Grace Njeri',
    providerRole: '5★ Verified Mama Fua',
    providerPhoto: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Oct 04, 2026',
    time: '04:00 PM',
    mpesaReceipt: 'QJK78129M1'
  },
  {
    id: 'sample-task-2',
    refCode: 'TM-2026-9012',
    service: 'Plumbing & Ball Valve Repair',
    description: 'Rooftop water tank ball valve replacement & pipe leak fix',
    price: 2500,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'Scheduled',
    providerName: 'Juma Mwangi',
    providerRole: 'Licensed Plumber',
    providerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    providerRating: 5.0,
    date: 'Oct 04, 2026',
    time: '11:00 AM',
    mpesaReceipt: 'QJK78130M2'
  },
  {
    id: 'sample-task-3',
    refCode: 'TM-2026-9013',
    service: 'Electrical Sockets & Inverter Setup',
    description: 'Diagnosing tripping breaker and connecting backup inverter line',
    price: 3200,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'ASAP',
    providerName: 'Eng. Paul Karanja',
    providerRole: 'Master Electrician',
    providerPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Oct 03, 2026',
    time: '02:15 PM',
    mpesaReceipt: 'QJK78131M3'
  },
  {
    id: 'sample-task-4',
    refCode: 'TM-2026-9014',
    service: 'Deep House Cleaning & Disinfection',
    description: '3-bedroom apartment floor scrubbing, tile grouting & windows',
    price: 4500,
    location: 'Kilimani, Chania Ave',
    status: 'assigned',
    urgency: 'Scheduled',
    providerName: 'Mary Wanjiku',
    providerRole: 'Cleaning Specialist',
    providerPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.8,
    date: 'Oct 03, 2026',
    time: '08:00 AM',
    mpesaReceipt: 'QJK78132M4'
  },
  {
    id: 'sample-task-5',
    refCode: 'TM-2026-9015',
    service: 'Fundi Carpentry & Door Fix',
    description: 'Solid mahogany front door realignment and lock reinforcement',
    price: 2200,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'Scheduled',
    providerName: 'Peter Omondi',
    providerRole: 'Master Fundi',
    providerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Oct 02, 2026',
    time: '01:45 PM',
    mpesaReceipt: 'QJK78133M5'
  },
  {
    id: 'sample-task-6',
    refCode: 'TM-2026-9016',
    service: 'Compound Lawn Mowing & Hedge Trim',
    description: 'Quarter acre compound grass cutting, edge trimming & debris sweep',
    price: 3000,
    location: 'Kilimani, Chania Ave',
    status: 'assigned',
    urgency: 'Scheduled',
    providerName: 'Sammy Kamau',
    providerRole: 'Landscaping Pro',
    providerPhoto: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.8,
    date: 'Oct 02, 2026',
    time: '10:00 AM',
    mpesaReceipt: 'QJK78134M6'
  },
  {
    id: 'sample-task-7',
    refCode: 'TM-2026-9017',
    service: 'Instant Shower Heater Installation',
    description: 'Installing 7.5kW Lorenzetti shower with dedicated 4mm cable',
    price: 2800,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'ASAP',
    providerName: 'David Otieno',
    providerRole: 'Certified Technician',
    providerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    providerRating: 5.0,
    date: 'Oct 01, 2026',
    time: '04:30 PM',
    mpesaReceipt: 'QJK78135M7'
  },
  {
    id: 'sample-task-8',
    refCode: 'TM-2026-9018',
    service: 'Eco-Friendly Kitchen Pest Control',
    description: 'Gel baiting for roaches & residual organic spray across cabinets',
    price: 3500,
    location: 'Kilimani, Chania Ave',
    status: 'assigned',
    urgency: 'Scheduled',
    providerName: 'BioShield Kenya',
    providerRole: 'Certified Fumigator',
    providerPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Oct 01, 2026',
    time: '09:00 AM',
    mpesaReceipt: 'QJK78136M8'
  },
  {
    id: 'sample-task-9',
    refCode: 'TM-2026-9019',
    service: 'House Moving & Heavy Furniture Lift',
    description: 'Relocating sectional sofa, beds and wardrobe with 2 loaders',
    price: 6500,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'ASAP',
    providerName: 'Express Movers KE',
    providerRole: 'Professional Movers',
    providerPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.8,
    date: 'Sep 30, 2026',
    time: '07:30 AM',
    mpesaReceipt: 'QJK78137M9'
  },
  {
    id: 'sample-task-10',
    refCode: 'TM-2026-9020',
    service: 'Split AC Filter Cleaning & Gas Top-Up',
    description: 'Indoor coil antibacterial foaming & R410A refrigerant charge',
    price: 3800,
    location: 'Kilimani, Chania Ave',
    status: 'assigned',
    urgency: 'Scheduled',
    providerName: 'CoolAir Pros',
    providerRole: 'HVAC Specialist',
    providerPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Sep 29, 2026',
    time: '03:00 PM',
    mpesaReceipt: 'QJK78138M10'
  },
  {
    id: 'sample-task-11',
    refCode: 'TM-2026-9021',
    service: 'Washing Machine Pump Unclog & Repair',
    description: 'Front loader drum inspection and drain pump filter clearance',
    price: 3400,
    location: 'Kilimani, Chania Ave',
    status: 'in-progress',
    urgency: 'Scheduled',
    providerName: 'Brian Kiprop',
    providerRole: 'Appliance Fundi',
    providerPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    providerRating: 5.0,
    date: 'Sep 28, 2026',
    time: '12:00 PM',
    mpesaReceipt: 'QJK78139M11'
  },
  {
    id: 'sample-task-12',
    refCode: 'TM-2026-9022',
    service: 'Interior Wall Painting Touch-Ups',
    description: 'Living room feature wall neutral silk paint & minor skimming',
    price: 4000,
    location: 'Kilimani, Chania Ave',
    status: 'assigned',
    urgency: 'Scheduled',
    providerName: 'Master Painters KE',
    providerRole: 'Decor & Paint Pro',
    providerPhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop',
    providerRating: 4.9,
    date: 'Sep 27, 2026',
    time: '10:30 AM',
    mpesaReceipt: 'QJK78140M12'
  }
];

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
  const [chattingTask, setChattingTask] = useState<any>(null);
  const [schedulingTask, setSchedulingTask] = useState<any>(null);
  const [scheduledTimes, setScheduledTimes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('taskmolly_scheduled_times');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      'sample-task-1': 'Today, Oct 05 at 09:30 AM',
      'sample-task-2': 'Today, Oct 05 at 11:00 AM',
      'sample-task-3': 'Today, Oct 05 at 02:15 PM',
      'sample-task-4': 'Tomorrow, Oct 06 at 08:00 AM',
      'sample-task-5': 'Tomorrow, Oct 06 at 01:45 PM',
      'sample-task-6': 'Tomorrow, Oct 06 at 10:00 AM',
      'sample-task-7': 'Wednesday, Oct 07 at 04:30 PM',
      'sample-task-8': 'Wednesday, Oct 07 at 09:00 AM',
      'sample-task-9': 'Wednesday, Oct 07 at 07:30 AM',
      'sample-task-10': 'Thursday, Oct 08 at 03:00 PM',
      'sample-task-11': 'Thursday, Oct 08 at 12:00 PM',
      'sample-task-12': 'Thursday, Oct 08 at 10:30 AM'
    };
  });

  const handleUpdateScheduledTime = (taskId: string, scheduledString: string) => {
    setScheduledTimes(prev => {
      const next = { ...prev, [taskId]: scheduledString };
      localStorage.setItem('taskmolly_scheduled_times', JSON.stringify(next));
      return next;
    });
  };

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
    const data = getPendingRequest();
    setPendingRequestInfo(data);
  }, [syncStatus, isSyncing]);

  const finalizePendingRequest = async () => {
    if (isSyncing || syncStatus !== 'idle') return;
    
    const pendingData = getPendingRequest();
    if (pendingData && user.uid) {
      setSyncStatus('syncing');
      setIsSyncing(true);
      console.log(`[ClientTasks Sync Log] Finalizing pending request directly for ${user.uid}...`);
      toast.info("Finalizing your service request...", { id: 'finalizing-task' });

      try {
        const result = await syncPendingRequestService(user);
        if (result.success) {
          setSyncStatus('done');
          toast.success("Task created and active!", { id: 'finalizing-task' });
        } else {
          setSyncStatus('idle');
        }
      } catch (err) {
        console.error("[ClientTasks Sync Log] Exception:", err);
        setSyncStatus('idle');
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1500);
      }
    }
  };

  useEffect(() => {
    if (!user.uid) return;
    
    const checkAndSync = () => {
      if (getPendingRequest() && !isSyncing && syncStatus === 'idle') {
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

      // Merge locally cached jobs for instant display
      try {
        const localSaved = JSON.parse(localStorage.getItem('taskmolly_saved_requests') || '[]');
        const userLocal = localSaved.filter((lj: any) => lj.clientId === user.uid);
        userLocal.forEach((lj: any) => {
          if (!jobs.some(j => j.id === lj.id || (lj.syncId && (j as any).syncId === lj.syncId))) {
            jobs.unshift({
              id: lj.id,
              status: lj.status || 'pending',
              ...lj,
              service: lj.serviceType || lj.service || 'General Service',
              price: lj.clientPrice || lj.budget || 0,
              date: lj.date || new Date().toLocaleDateString(),
              createdAt: new Date(lj.createdAt || Date.now()),
              isExpired: false
            });
          }
        });
      } catch (cacheErr) {
        console.warn("Local jobs merge skipped:", cacheErr);
      }

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
                          onClick={() => setChattingTask({
                            ...job,
                            scheduledTime: scheduledTimes[job.id] || `${job.date || 'Today'} at ${job.time || '10:00 AM'}`
                          })}
                          className="px-4 py-2 bg-rich-black text-accent-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-1.5"
                        >
                          <MessageSquare size={13} className="text-accent-gold" />
                          Chat with Pro
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

  const ongoingScrollRef = useRef<HTMLDivElement>(null);
  const [currentOngoingIndex, setCurrentOngoingIndex] = useState(0);

  const handleOngoingScroll = () => {
    if (ongoingScrollRef.current) {
      const { scrollLeft } = ongoingScrollRef.current;
      const index = Math.round(scrollLeft / 316);
      setCurrentOngoingIndex(Math.max(0, Math.min(index, allOngoingTasks.length - 1)));
    }
  };

  const scrollOngoing = (direction: 'left' | 'right') => {
    if (ongoingScrollRef.current) {
      const newIndex = direction === 'left'
        ? Math.max(0, currentOngoingIndex - 1)
        : Math.min(allOngoingTasks.length - 1, currentOngoingIndex + 1);
      
      const offset = newIndex * 316;
      ongoingScrollRef.current.scrollTo({ left: offset, behavior: 'smooth' });
      setCurrentOngoingIndex(newIndex);
    }
  };

  const handleDownloadPDFStatement = () => {
    try {
      const doc = new jsPDF() as any;
      
      // Header styling
      doc.setFillColor(26, 29, 32); // Rich black #1A1D20
      doc.rect(0, 0, 210, 36, 'F');
      
      // Title & Brand
      doc.setTextColor(212, 160, 23); // Accent gold
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TASK MOLLY KENYA', 14, 16);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL CLIENT ACCOUNT STATEMENT', 14, 24);
      doc.text('Statement Ref: TM-STMT-2026-NBI', 14, 30);
      
      // Client details
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text(`Client Name: ${user.displayName || 'Kelvin Wachira'}`, 14, 44);
      doc.text(`Account ID: ${user.uid || 'dev_client_001'}`, 14, 50);
      doc.text(`Financial Year: 2026`, 140, 44);
      doc.text(`Generated Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, 140, 50);
      
      const tableColumns = ['Ref Code', 'Date', 'Service', 'Assigned Pro', 'Location', 'M-Pesa Ref', 'Amount (KES)', 'Status'];
      const tableRows = TWELVE_SAMPLE_TASKS.map(t => [
        t.refCode,
        t.date,
        t.service,
        t.providerName,
        t.location,
        t.mpesaReceipt,
        t.price.toLocaleString(),
        'Settled'
      ]);

      doc.autoTable({
        startY: 56,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 29, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 26 },
          1: { cellWidth: 20 },
          2: { cellWidth: 38 },
          3: { cellWidth: 25 },
          4: { cellWidth: 28 },
          5: { cellWidth: 24, font: 'courier' },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
          7: { halign: 'center', cellWidth: 15 }
        },
        foot: [
          [
            { content: 'Total (12 Reconciled Services):', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
            { content: `KES ${totalStatementSum.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [26, 29, 32] } },
            { content: 'PAID', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, textColor: [16, 140, 80] } }
          ]
        ],
        footStyles: {
          fillColor: [245, 245, 245]
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 240;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('This statement is electronically verified. All funds processed and settled via Safaricom M-Pesa automated escrow.', 14, finalY + 12);
      doc.text('Task Molly Concierge Support: support@taskmolly.co.ke | Nairobi, Kenya', 14, finalY + 17);

      doc.save('TaskMolly_Client_Statement_2026.pdf');
      toast.success('PDF Statement downloaded successfully!');
    } catch (err) {
      console.error('PDF Statement generation error:', err);
      toast.error('Failed to generate PDF statement');
    }
  };

  const handleDownloadTaskReceipt = (task: SampleTaskItem) => {
    try {
      const doc = new jsPDF() as any;
      
      // Header Banner
      doc.setFillColor(26, 29, 32);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Logo & Header text
      doc.setTextColor(212, 160, 23); // gold
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TASK MOLLY KENYA', 14, 18);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL PAYMENT RECEIPT', 14, 27);
      
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(`Receipt No: ${task.mpesaReceipt}  •  Ref: ${task.refCode}`, 14, 34);
      doc.text(`Issued: ${task.date} at ${task.time}`, 140, 34);

      // Decorative separator line
      doc.setDrawColor(212, 160, 23);
      doc.setLineWidth(1);
      doc.line(14, 46, 196, 46);

      // Client & Provider Info Grid
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('CLIENT DETAILS', 14, 54);
      doc.text('SERVICE PROVIDER', 110, 54);

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(user.displayName || 'Kelvin Wachira', 14, 61);
      doc.text(task.providerName, 110, 61);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Location: ${task.location}`, 14, 67);
      doc.text(`Account ID: ${user.uid || 'dev_client_001'}`, 14, 73);
      doc.text(`Role: ${task.providerRole}`, 110, 67);
      doc.text(`Verification Rating: ${task.providerRating} / 5.0 (Verified)`, 110, 73);

      // Receipt details table
      doc.autoTable({
        startY: 82,
        head: [['Item Description', 'Service Category', 'M-Pesa Code', 'Total Paid']],
        body: [
          [
            `${task.service}\n\n"${task.description}"`,
            task.service,
            task.mpesaReceipt,
            `KES ${task.price.toLocaleString()}`
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [26, 29, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [40, 40, 40]
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30, font: 'courier' },
          3: { halign: 'right', fontStyle: 'bold', cellWidth: 27 }
        },
        foot: [
          [
            { content: 'Total Settled Amount:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
            { content: `KES ${task.price.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, textColor: [26, 29, 32] } }
          ]
        ],
        footStyles: {
          fillColor: [245, 245, 245]
        }
      });

      const receiptFinalY = (doc as any).lastAutoTable.finalY || 160;

      // Status Badge Box
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(14, receiptFinalY + 8, 182, 22, 2, 2, 'FD');

      doc.setTextColor(6, 95, 70); // emerald-800
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT STATUS: SETTLED & RECONCILED VIA M-PESA ESCROW', 20, receiptFinalY + 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Transaction verified under reference ${task.refCode}. Service marked 100% completed.`, 20, receiptFinalY + 24);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text('Task Molly Kenya • Verified Service Delivery & Automated Escrow Release', 14, receiptFinalY + 40);
      doc.text('Questions about this receipt? Reach out to support@taskmolly.co.ke', 14, receiptFinalY + 46);

      doc.save(`Receipt_${task.refCode}_${task.mpesaReceipt}.pdf`);
      toast.success(`Receipt downloaded for ${task.refCode}!`);
    } catch (err) {
      console.error('Receipt generation error:', err);
      toast.error('Failed to generate receipt PDF');
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Statement Ref', 'Date', 'Time', 'Service', 'Description', 'Provider Name', 'Location', 'M-Pesa Receipt', 'Amount (KES)', 'Status'];
    const rows = TWELVE_SAMPLE_TASKS.map(t => [
      t.refCode,
      t.date,
      t.time,
      `"${t.service}"`,
      `"${t.description}"`,
      `"${t.providerName}"`,
      `"${t.location}"`,
      t.mpesaReceipt,
      t.price,
      'Settled & Paid'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TaskMolly_Client_Statement_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Client Statement (.CSV) downloaded!");
  };

  const handlePrintStatement = () => {
    window.print();
    toast.info("Preparing Statement for printing or saving to PDF...");
  };

  // Combine real active jobs with 12 sample ongoing tasks
  const allOngoingTasks = [
    ...realJobs
      .filter(j => !optimisticHiddenIds.has(j.id) && (j.status === 'pending' || j.status === 'assigned' || j.status === 'in-progress'))
      .map((j, i) => ({
        id: j.id,
        refCode: `TM-LIVE-${1000 + i}`,
        service: j.service,
        description: j.description || 'Custom service request submitted via platform',
        price: j.price || 2500,
        location: CLIENT_DEFAULT_LOCATION,
        status: j.status || 'in-progress',
        urgency: (j.urgency || 'ASAP') as 'ASAP' | 'Scheduled',
        providerName: j.providerName || 'Task Molly Verified Pro',
        providerRole: 'Verified Specialist',
        providerPhoto: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop`,
        providerRating: 5.0,
        date: j.date || 'Today',
        time: 'Just now',
        mpesaReceipt: `MP${Math.floor(10000000 + Math.random() * 90000000)}`
      })),
    ...TWELVE_SAMPLE_TASKS
  ];

  const totalStatementSum = TWELVE_SAMPLE_TASKS.reduce((acc, curr) => acc + curr.price, 0);

  const [taskViewTab, setTaskViewTab] = useState<'ongoing' | 'history'>('ongoing');

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-primary-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] bg-primary-bg pt-5 md:pt-6 pb-4 px-4 md:px-6 overflow-hidden flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top: Starts straight from Add New Service Request */}
        <div className="mb-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3.5 px-6 bg-rich-black hover:bg-black text-accent-gold font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-accent-gold/10 transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer border border-accent-gold/20"
          >
            <Plus size={18} />
            <span>Add New Service Request</span>
          </button>
        </div>

        {/* Tab switcher for Ongoing vs Task History - Middle Aligned */}
        <div className="flex items-center justify-center gap-2 mb-3 shrink-0 w-full">
          <div className="flex items-center gap-2 bg-neutral-100/70 p-1 rounded-2xl border border-warm-gray/50">
            <button
              onClick={() => setTaskViewTab('ongoing')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                taskViewTab === 'ongoing'
                  ? 'bg-rich-black text-white shadow-sm'
                  : 'bg-white text-rich-black/60 border border-warm-gray/60 hover:border-accent-gold'
              }`}
            >
              <span>Ongoing Tasks</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${taskViewTab === 'ongoing' ? 'bg-accent-gold text-white' : 'bg-warm-gray text-rich-black/60'}`}>
                {allOngoingTasks.length}
              </span>
            </button>

            <button
              onClick={() => setTaskViewTab('history')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                taskViewTab === 'history'
                  ? 'bg-rich-black text-white shadow-sm'
                  : 'bg-white text-rich-black/60 border border-warm-gray/60 hover:border-accent-gold'
              }`}
            >
              <Receipt size={14} className="text-accent-gold" />
              <span>Task History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${taskViewTab === 'history' ? 'bg-accent-gold text-white' : 'bg-warm-gray text-rich-black/60'}`}>
                12
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeJob ? (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <ServiceTrackingDetail 
                key="tracking"
                job={activeJob} 
                onBack={() => setActiveJob(null)} 
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-2 space-y-4">
              
              {/* Ongoing Tasks View: 12 Sample Tasks Scrollable Right to Left */}
              {taskViewTab === 'ongoing' && (
                <div className="space-y-3">
                  {/* Ongoing Section Controls: Numbering before arrows matching Open Forum */}
                  <div className="flex items-center justify-end px-1">
                    <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full border border-warm-gray/60">
                      <span className="text-[11px] font-black text-rich-black">
                        {currentOngoingIndex + 1}
                      </span>
                      <span className="text-[10px] text-rich-black/40 font-bold">/</span>
                      <span className="text-[10px] text-rich-black/40 font-bold">
                        {allOngoingTasks.length}
                      </span>
                      <div className="flex items-center gap-1 ml-1.5">
                        <button
                          onClick={() => scrollOngoing('left')}
                          className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                          title="Previous Task"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => scrollOngoing('right')}
                          className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                          title="Next Task"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scroll Track: Right-to-Left Scrollable */}
                  <div 
                    ref={ongoingScrollRef}
                    onScroll={handleOngoingScroll}
                    className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
                    style={{ scrollSnapType: 'x mandatory' }}
                  >
                    {allOngoingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="w-[300px] sm:w-[325px] shrink-0 snap-start bg-white border border-warm-gray hover:border-accent-gold/50 rounded-[2rem] p-5 shadow-sm transition-all flex flex-col justify-between group hover:shadow-md"
                      >
                        <div>
                          {/* Card Header: Icon & Full Task Name (Urgency tag removed from top right) */}
                          <div className="flex items-start gap-3 mb-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-primary-bg flex items-center justify-center text-accent-gold border border-warm-gray/60 shrink-0">
                              {getServiceIcon(task.service)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent-gold block">
                                {task.refCode}
                              </span>
                              <h3 className="text-sm font-bold text-rich-black leading-snug break-words">
                                {task.service}
                              </h3>
                            </div>
                          </div>

                          {/* PROMINENT FULL SCHEDULED TIME - Most Important Placard Detail */}
                          <div className="mb-3 p-3 bg-neutral-50/90 rounded-2xl border border-warm-gray/60 group-hover:border-accent-gold/40 transition-colors">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Clock size={13} className="text-accent-gold shrink-0" />
                                <span className="text-[9px] uppercase tracking-widest font-black text-accent-gold truncate">
                                  Scheduled Time
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchedulingTask({
                                    ...task,
                                    scheduledTime: scheduledTimes[task.id] || formatFullScheduledTime(task.date, task.time)
                                  });
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-rich-black border border-warm-gray hover:border-accent-gold rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                                title="Schedule or change arrival time"
                              >
                                Schedule Time
                              </button>
                            </div>
                            <p className="text-xs sm:text-[13px] font-black text-rich-black leading-snug">
                              {scheduledTimes[task.id] || formatFullScheduledTime(task.date, task.time)}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5 mb-2.5 bg-green-50/60 border border-green-200/60 px-2.5 py-1 rounded-xl w-fit">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                              {task.status === 'in-progress' ? 'In Progress' : 'Assigned & Dispatched'}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-rich-black/70 line-clamp-2 italic mb-3 leading-relaxed">
                            "{task.description}"
                          </p>

                          {/* Assigned Pro Card */}
                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-primary-bg border border-warm-gray/60 mb-3">
                            <img
                              src={task.providerPhoto}
                              alt={task.providerName}
                              className="w-8 h-8 rounded-full object-cover border border-accent-gold shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-rich-black truncate">{task.providerName}</p>
                                <div className="flex items-center gap-0.5 text-accent-gold text-[10px] font-black shrink-0">
                                  <Star size={10} fill="currentColor" />
                                  <span>{task.providerRating}</span>
                                </div>
                              </div>
                              <p className="text-[9px] text-rich-black/40 truncate">{task.providerRole}</p>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Centered Chat with Pro Button (Service Cost Removed) */}
                        <div className="pt-3 border-t border-warm-gray/40 flex flex-col items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setChattingTask({
                                ...task,
                                scheduledTime: scheduledTimes[task.id] || formatFullScheduledTime(task.date, task.time)
                              });
                            }}
                            className="w-full py-2.5 px-4 bg-rich-black hover:bg-black text-accent-gold text-xs font-black tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <MessageSquare size={14} className="text-accent-gold" />
                            <span>Chat with {getProFirstName(task.providerName)}</span>
                          </button>
                          {task.location && (
                            <p className="text-[10px] uppercase tracking-wider text-rich-black/45 font-bold text-center truncate max-w-full">
                              {task.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task History View: Retained Sheet with Download Column & Bottom Download Statement Button */}
              {taskViewTab === 'history' && (
                <div className="space-y-4">
                  {/* Statement Itemized Ledger Table (Sheet) */}
                  <div className="bg-white border border-warm-gray rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-primary-bg/70 border-b border-warm-gray/60 text-[10px] uppercase tracking-wider font-black text-rich-black/50">
                            <th className="py-3 px-4">Ref Code</th>
                            <th className="py-3 px-4">Date & Time</th>
                            <th className="py-3 px-4">Service & Context</th>
                            <th className="py-3 px-4">Assigned Pro</th>
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4">M-Pesa Receipt</th>
                            <th className="py-3 px-4 text-right">Amount (KES)</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-center">Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-gray/30 text-rich-black font-medium">
                          {TWELVE_SAMPLE_TASKS.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-primary-bg/20'}>
                              <td className="py-3 px-4 font-mono font-bold text-accent-gold whitespace-nowrap">
                                {item.refCode}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-rich-black/70">
                                <div>{item.date}</div>
                                <div className="text-[10px] text-rich-black/40">{item.time}</div>
                              </td>
                              <td className="py-3 px-4 max-w-[220px]">
                                <div className="font-bold text-rich-black truncate">{item.service}</div>
                                <div className="text-[10px] text-rich-black/50 truncate italic">{item.description}</div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <img src={item.providerPhoto} alt={item.providerName} className="w-5 h-5 rounded-full object-cover" />
                                  <span className="font-semibold text-rich-black">{item.providerName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-rich-black/60 whitespace-nowrap">
                                {item.location}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-rich-black/50 whitespace-nowrap">
                                {item.mpesaReceipt}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-rich-black whitespace-nowrap">
                                KES {item.price.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Settled ✓
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDownloadTaskReceipt(item)}
                                  className="px-2.5 py-1.5 bg-primary-bg hover:bg-rich-black hover:text-accent-gold border border-warm-gray hover:border-rich-black text-rich-black rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group"
                                  title={`Download PDF receipt for ${item.refCode}`}
                                >
                                  <Download size={12} className="text-accent-gold group-hover:text-accent-gold" />
                                  <span>Receipt</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-primary-bg/90 border-t-2 border-warm-gray text-rich-black font-bold">
                            <td colSpan={6} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-rich-black/60">
                              Statement Total (12 Services Reconciled):
                            </td>
                            <td className="py-3 px-4 text-right text-sm font-black text-rich-black">
                              KES {totalStatementSum.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[9px] font-black text-emerald-700 uppercase">Paid in Full</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[9px] text-rich-black/40 font-mono">12 Receipts</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Bottom of the page: Back button labeled as Back and contextual bottom right action */}
        <div className="pt-3 pb-1 border-t border-warm-gray/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold uppercase tracking-wider text-rich-black/70 hover:text-rich-black shadow-sm transition-all active:scale-95 group cursor-pointer"
          >
            <ArrowLeft size={16} className="text-rich-black/50 group-hover:text-accent-gold transition-colors" />
            <span>Back</span>
          </button>

          {taskViewTab === 'history' ? (
            <button
              onClick={handleDownloadPDFStatement}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-rich-black hover:bg-black text-white hover:text-accent-gold border border-rich-black hover:border-accent-gold/40 rounded-full text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 group cursor-pointer"
            >
              <Download size={15} className="text-accent-gold group-hover:scale-110 transition-transform" />
              <span>Download History</span>
            </button>
          ) : (
            <span className="text-[10px] text-rich-black/40 font-semibold tracking-wide">
              Client Tasks & Requests
            </span>
          )}
        </div>
      </div>

      {/* Chat With Pro Modal */}
      <ChatWithProModal
        isOpen={!!chattingTask}
        onClose={() => setChattingTask(null)}
        task={chattingTask}
        clientName={user.displayName || 'Kelvin'}
      />

      {/* Schedule Time Modal */}
      <ScheduleTimeModal
        isOpen={!!schedulingTask}
        onClose={() => setSchedulingTask(null)}
        task={schedulingTask}
        onConfirmSchedule={(taskId, scheduledString) => {
          handleUpdateScheduledTime(taskId, scheduledString);
        }}
      />

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
