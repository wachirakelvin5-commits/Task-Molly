import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { 
  ArrowLeft,
  Star, 
  CheckCircle, 
  Clock, 
  MapPin, 
  DollarSign,
  MessageSquare,
  Activity,
  Zap,
  Droplet,
  Hammer,
  Paintbrush,
  Leaf,
  Truck,
  Sparkles,
  WashingMachine,
  Phone,
  ChevronLeft,
  ChevronRight,
  Download,
  Shield,
  Wind,
  Briefcase
} from 'lucide-react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Service category offerings for the provider
const ALL_AVAILABLE_CATEGORIES = [
  { id: 'mama_fua', name: 'Mama Fua / Laundry', icon: WashingMachine },
  { id: 'electrical', name: 'Electrical & Solar', icon: Zap },
  { id: 'plumbing', name: 'Plumbing & Drainage', icon: Droplet },
  { id: 'fundi', name: 'Fundi / Handyman', icon: Hammer },
  { id: 'gardening', name: 'Gardening & Landscaping', icon: Leaf },
  { id: 'moving', name: 'Movers & Relocation', icon: Truck },
  { id: 'painting', name: 'House Painting', icon: Paintbrush },
  { id: 'cleaning', name: 'Deep Cleaning', icon: Sparkles }
];

// 8 Rich Sample Available Client Tasks for Visualization
const SAMPLE_AVAILABLE_TASKS = [
  {
    id: 'avail_sample_1',
    refCode: 'REQ-2026-801',
    clientName: 'Grace Muthoni',
    clientPhone: '+254 722 101 202',
    service: 'Emergency Pipe Leak & Tap Repair',
    location: 'Kilimani, Denis Pritt Rd',
    price: 2800,
    time: 'ASAP',
    scheduledTime: 'Today • Within 1 Hour',
    description: 'Kitchen sink pipe burst under sink cabinet. Need urgent isolation and brass joint fitting.',
    createdAt: new Date()
  },
  {
    id: 'avail_sample_2',
    refCode: 'REQ-2026-802',
    clientName: 'Eng. Victor Omondi',
    clientPhone: '+254 712 234 567',
    service: 'Backup Inverter & Solar DB Hookup',
    location: 'Westlands, Rhapta Road',
    price: 4500,
    time: 'Scheduled',
    scheduledTime: 'Tomorrow • 10:00 AM',
    description: 'Connecting a 5kVA Felicity solar inverter to sub-distribution board with manual changeover switch.',
    createdAt: new Date(Date.now() - 25 * 60 * 1000)
  },
  {
    id: 'avail_sample_3',
    refCode: 'REQ-2026-803',
    clientName: 'Wanjiku Mwangi',
    clientPhone: '+254 733 456 789',
    service: '3-Bedroom Move-In Deep Scrub & Polish',
    location: 'Lavington, Hatheru Rd',
    price: 5200,
    time: 'Scheduled',
    scheduledTime: 'Oct 06 • 08:30 AM',
    description: 'Floor scrubbing, window panes, balcony tile grouting, and kitchen cupboards steam sanitization.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000)
  },
  {
    id: 'avail_sample_4',
    refCode: 'REQ-2026-804',
    clientName: 'Brian Kiprono',
    clientPhone: '+254 701 567 890',
    service: 'Instant Shower 7.5kW Lorenzetti Wiring',
    location: 'Kileleshwa, Siaya Rd',
    price: 3200,
    time: 'ASAP',
    scheduledTime: 'Today • 02:00 PM',
    description: 'Running a fresh 4mm twin earth cable from consumer unit with 32A MCB for new bathroom heater.',
    createdAt: new Date(Date.now() - 60 * 60 * 1000)
  },
  {
    id: 'avail_sample_5',
    refCode: 'REQ-2026-805',
    clientName: 'Amina Hassan',
    clientPhone: '+254 718 678 901',
    service: 'Quarter-Acre Lawn Mowing & Hedge Sculpting',
    location: 'Karen, Bogani East',
    price: 3800,
    time: 'Scheduled',
    scheduledTime: 'Oct 07 • 09:00 AM',
    description: 'Compound grass trim, edge cutting along driveway, and green debris clearance.',
    createdAt: new Date(Date.now() - 90 * 60 * 1000)
  },
  {
    id: 'avail_sample_6',
    refCode: 'REQ-2026-806',
    clientName: 'Caleb Ndegwa',
    clientPhone: '+254 725 789 012',
    service: 'CCTV 4-Channel Dahua Setup & Mobile Sync',
    location: 'Parklands, 4th Avenue',
    price: 4600,
    time: 'Scheduled',
    scheduledTime: 'Oct 08 • 11:00 AM',
    description: 'Mounting 4 IP bullet cameras, POE switch termination, and configuring DMSS remote app.',
    createdAt: new Date(Date.now() - 110 * 60 * 1000)
  },
  {
    id: 'avail_sample_7',
    refCode: 'REQ-2026-807',
    clientName: 'Faith Chepchumba',
    clientPhone: '+254 703 890 123',
    service: 'Kitchen Wall Skimming & Matt Emulsion Paint',
    location: 'South C, Muhoho Ave',
    price: 3900,
    time: 'ASAP',
    scheduledTime: 'Today • 03:30 PM',
    description: 'Wall scraper prep, gyproc skimming coat, and Crown Vinyl Matt paint finish.',
    createdAt: new Date(Date.now() - 130 * 60 * 1000)
  },
  {
    id: 'avail_sample_8',
    refCode: 'REQ-2026-808',
    clientName: 'George Mwita',
    clientPhone: '+254 734 901 234',
    service: 'Automatic Washing Machine Drum Bearings Check',
    location: 'Roysambu, Lumumba Dr',
    price: 3100,
    time: 'Scheduled',
    scheduledTime: 'Oct 09 • 01:00 PM',
    description: 'Whirlpool front loader noise diagnosis, belt check, and drum axle stability test.',
    createdAt: new Date(Date.now() - 150 * 60 * 1000)
  }
];

// 8 Rich Sample Ongoing Tasks for Visualization
const SAMPLE_ONGOING_TASKS = [
  {
    id: 'active_sample_1',
    refCode: 'ACT-2026-401',
    clientName: 'Kelvin Wachira',
    clientPhone: '+254 712 345 678',
    service: 'Water Tank Ball Valve Replacement',
    location: 'Kilimani, Chania Ave',
    price: 2500,
    status: 'in-progress',
    scheduledTime: '4th October, Sunday 4pm',
    description: 'Rooftop water tank ball valve replacement with high-pressure brass fitting.'
  },
  {
    id: 'active_sample_2',
    refCode: 'ACT-2026-402',
    clientName: 'Esther Njeri',
    clientPhone: '+254 722 890 123',
    service: 'Living Room Feature Wall Painting & Skimming',
    location: 'South C, Five Star Estate',
    price: 4800,
    status: 'assigned',
    scheduledTime: '5th October, Monday 9am',
    description: 'Feature wall prep, primer coating, and neutral silk finish application.'
  },
  {
    id: 'active_sample_3',
    refCode: 'ACT-2026-403',
    clientName: 'Daniel Mbugua',
    clientPhone: '+254 733 456 789',
    service: 'Front Loader Washing Machine Pump Fix',
    location: 'Parklands, 3rd Parklands Ave',
    price: 3400,
    status: 'in-progress',
    scheduledTime: '5th October, Monday 1pm',
    description: 'Front loader drum inspection and drain pump filter blockage clearance.'
  },
  {
    id: 'active_sample_4',
    refCode: 'ACT-2026-404',
    clientName: 'Mercy Wambui',
    clientPhone: '+254 701 234 567',
    service: 'Mama Fua Delicates Wash & Ironing',
    location: 'Kileleshwa, Mandera Rd',
    price: 2200,
    status: 'in-progress',
    scheduledTime: '6th October, Tuesday 10am',
    description: '4 baskets of laundry, curtains steam press, and linen fold.'
  },
  {
    id: 'active_sample_5',
    refCode: 'ACT-2026-405',
    clientName: 'David Kimani',
    clientPhone: '+254 718 992 110',
    service: 'Consumer Unit MCB Breaker Replacement',
    location: 'Westlands, School Lane',
    price: 3600,
    status: 'in-progress',
    scheduledTime: '6th October, Tuesday 2pm',
    description: 'Replace tripping 40A main circuit breaker and balance phases on domestic consumer unit.'
  },
  {
    id: 'active_sample_6',
    refCode: 'ACT-2026-406',
    clientName: 'Dr. Joyce Aluoch',
    clientPhone: '+254 721 345 908',
    service: 'Compound Landscaping & Bougainvillea Trim',
    location: 'Lavington, Chalbi Dr',
    price: 4100,
    status: 'assigned',
    scheduledTime: '7th October, Wednesday 8am',
    description: 'Shaping perimeter hedge, edge weeding along interlocking pavers, and lawn raking.'
  },
  {
    id: 'active_sample_7',
    refCode: 'ACT-2026-407',
    clientName: 'Samson Kibet',
    clientPhone: '+254 705 671 223',
    service: 'Kitchen Mixer Tap & Under-Sink Trap Repair',
    location: 'Kilimani, Argwings Kodhek',
    price: 2700,
    status: 'in-progress',
    scheduledTime: '7th October, Wednesday 11am',
    description: 'Replacing worn flexible hoses, chrome swan-neck mixer tap, and bottle trap.'
  },
  {
    id: 'active_sample_8',
    refCode: 'ACT-2026-408',
    clientName: 'Sarah Achieng',
    clientPhone: '+254 731 880 456',
    service: '4-Burner Cooker Oven Igniter & Thermostat',
    location: 'Karen, Hardy Estate',
    price: 3500,
    status: 'in-progress',
    scheduledTime: '8th October, Thursday 3pm',
    description: 'Clearing clogged burner nozzles, recalibrating oven gas thermostat, and checking ignition spark.'
  }
];

// 12 Rich Completed Tasks for Task History Sheet View
export interface CompletedTaskHistoryItem {
  id: string;
  refCode: string;
  date: string;
  time: string;
  service: string;
  description: string;
  client: string;
  clientPhone: string;
  location: string;
  mpesaReceipt: string;
  price: number;
  rating: number;
  status: 'settled';
}

const SAMPLE_TASK_HISTORY: CompletedTaskHistoryItem[] = [
  {
    id: 'comp_1',
    refCode: 'ACT-2026-301',
    date: 'Oct 04, 2026',
    time: '04:30 PM',
    service: 'Electrical Repair & Rewiring',
    description: 'Fixed tripping breaker and replaced scorched 13A socket outlets in kitchen',
    client: 'David Otieno',
    clientPhone: '+254 712 111 222',
    location: 'Kilimani, Nairobi',
    mpesaReceipt: 'QJK78129M1',
    price: 3500,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_2',
    refCode: 'ACT-2026-302',
    date: 'Oct 03, 2026',
    time: '11:15 AM',
    service: 'Plumbing & Pipe Leak Fix',
    description: 'Replaced leaking copper bend with PPR pipe and full-bore gate valve',
    client: 'Mercy Chebet',
    clientPhone: '+254 722 333 444',
    location: 'Westlands, Nairobi',
    mpesaReceipt: 'QJK78130M2',
    price: 4200,
    rating: 4.9,
    status: 'settled'
  },
  {
    id: 'comp_3',
    refCode: 'ACT-2026-303',
    date: 'Oct 02, 2026',
    time: '09:00 AM',
    service: 'Mama Fua & Clothes Ironing',
    description: '4 laundry baskets wash, line dry, fold and steam pressing for linens',
    client: 'John Kamau',
    clientPhone: '+254 733 555 666',
    location: 'Lavington, Nairobi',
    mpesaReceipt: 'QJK78131M3',
    price: 2000,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_4',
    refCode: 'ACT-2026-304',
    date: 'Oct 01, 2026',
    time: '02:45 PM',
    service: 'Solar Water Heater Installation',
    description: 'Mounted evacuated vacuum tubes and plumbed insulated 300L rooftop tank',
    client: 'Sarah Wanjiku',
    clientPhone: '+254 701 777 888',
    location: 'Karen, Nairobi',
    mpesaReceipt: 'QJK78132M4',
    price: 6800,
    rating: 4.8,
    status: 'settled'
  },
  {
    id: 'comp_5',
    refCode: 'ACT-2026-305',
    date: 'Sep 29, 2026',
    time: '10:20 AM',
    service: 'Door Lock Reinforcement & Carpentry',
    description: 'Installed Union 3-lever mortice deadlock and reinforced hardwood door jamb',
    client: 'Peter Omondi',
    clientPhone: '+254 720 999 000',
    location: 'South C, Nairobi',
    mpesaReceipt: 'QJK78133M5',
    price: 2800,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_6',
    refCode: 'ACT-2026-306',
    date: 'Sep 27, 2026',
    time: '03:00 PM',
    service: 'Compound Lawn Care & Hedge Trimming',
    description: 'Rotary lawn mowing, perimeter pruning, and green garden waste clearance',
    client: 'Eunice Wangari',
    clientPhone: '+254 718 222 333',
    location: 'Kileleshwa, Nairobi',
    mpesaReceipt: 'QJK78134M6',
    price: 3200,
    rating: 4.9,
    status: 'settled'
  },
  {
    id: 'comp_7',
    refCode: 'ACT-2026-307',
    date: 'Sep 25, 2026',
    time: '01:10 PM',
    service: 'Instant Shower Heater Replacement',
    description: 'Fitted new Lorenzetti Blinducha with twin-earth dedicated 4mm cable',
    client: 'Felix Mutua',
    clientPhone: '+254 735 444 555',
    location: 'Roysambu, Nairobi',
    mpesaReceipt: 'QJK78135M7',
    price: 3000,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_8',
    refCode: 'ACT-2026-308',
    date: 'Sep 23, 2026',
    time: '11:30 AM',
    service: 'AC Antibacterial Coil Foam Clean',
    description: 'Disinfected split air handler, cleared condenser drain pan and lines',
    client: 'CoolAir Suites',
    clientPhone: '+254 702 666 777',
    location: 'Upper Hill, Nairobi',
    mpesaReceipt: 'QJK78136M8',
    price: 4500,
    rating: 4.9,
    status: 'settled'
  },
  {
    id: 'comp_9',
    refCode: 'ACT-2026-309',
    date: 'Sep 21, 2026',
    time: '04:00 PM',
    service: 'Kitchen Tile Grouting & Silicone Sealing',
    description: 'Scraped stained grout, resealed countertop edges with anti-fungal silicone',
    client: 'Beatrice Adhiambo',
    clientPhone: '+254 714 888 999',
    location: 'Parklands, Nairobi',
    mpesaReceipt: 'QJK78137M9',
    price: 2600,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_10',
    refCode: 'ACT-2026-310',
    date: 'Sep 19, 2026',
    time: '10:00 AM',
    service: 'Submersible Pump Float Switch Repair',
    description: 'Installed automatic float switch in underground tank with control box relay',
    client: 'Geoffrey Kariuki',
    clientPhone: '+254 725 000 111',
    location: 'Runda, Nairobi',
    mpesaReceipt: 'QJK78138M0',
    price: 5500,
    rating: 5.0,
    status: 'settled'
  },
  {
    id: 'comp_11',
    refCode: 'ACT-2026-311',
    date: 'Sep 16, 2026',
    time: '02:15 PM',
    service: 'Wooden Parquet Sanding & Wax Polish',
    description: 'Floor buffing, filler touchup, and high-traffic wax protective polish',
    client: 'Lilian Njoroge',
    clientPhone: '+254 737 222 333',
    location: 'Kilimani, Nairobi',
    mpesaReceipt: 'QJK78139M1',
    price: 4800,
    rating: 4.9,
    status: 'settled'
  },
  {
    id: 'comp_12',
    refCode: 'ACT-2026-312',
    date: 'Sep 14, 2026',
    time: '09:30 AM',
    service: 'Security Sensor & Solar Floodlight Mount',
    description: 'Installed 2x 100W radar motion-sensing LED floodlights on perimeter wall',
    client: 'Hassan Mohammed',
    clientPhone: '+254 703 444 555',
    location: 'South B, Nairobi',
    mpesaReceipt: 'QJK78140M2',
    price: 3700,
    rating: 5.0,
    status: 'settled'
  }
];

// Helper to select service icon
const getServiceIcon = (type: string) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('electr') || t.includes('solar') || t.includes('breaker') || t.includes('inverter')) return <Zap size={18} />;
  if (t.includes('plumb') || t.includes('water') || t.includes('leak') || t.includes('tap') || t.includes('tank')) return <Droplet size={18} />;
  if (t.includes('clean') || t.includes('wash') || t.includes('laundry') || t.includes('mama fua')) return <WashingMachine size={18} />;
  if (t.includes('paint')) return <Paintbrush size={18} />;
  if (t.includes('garden') || t.includes('lawn') || t.includes('hedge') || t.includes('landscap')) return <Leaf size={18} />;
  if (t.includes('move') || t.includes('relocat')) return <Truck size={18} />;
  if (t.includes('cctv') || t.includes('security')) return <Shield size={18} />;
  if (t.includes('ac') || t.includes('air') || t.includes('cool')) return <Wind size={18} />;
  if (t.includes('repair') || t.includes('fundi') || t.includes('fix') || t.includes('handyman') || t.includes('lock') || t.includes('carpenter')) return <Hammer size={18} />;
  return <Briefcase size={18} />;
};

interface ProviderServicesProps {
  user: UserProfile;
}

export default function ProviderServices({ user }: ProviderServicesProps) {
  const navigate = useNavigate();
  
  // Real Firestore tasks
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  // Sample tasks for rich visualization across all tabs
  const [localAvailableSamples, setLocalAvailableSamples] = useState(SAMPLE_AVAILABLE_TASKS);
  const [localOngoingSamples, setLocalOngoingSamples] = useState(SAMPLE_ONGOING_TASKS);
  const [taskHistory, setTaskHistory] = useState<CompletedTaskHistoryItem[]>(SAMPLE_TASK_HISTORY);

  // Tab: Available | Ongoing | Task History | Offered Categories
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history' | 'services'>('available');

  const [ignoredTaskIds, setIgnoredTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`ignored_tasks_${user.uid}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [proServices, setProServices] = useState<string[]>(() => {
    const saved = localStorage.getItem(`pro_services_${user.uid}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return user.services || ['Mama Fua', 'Plumbing', 'Electrician', 'Fundi'];
  });

  // Carousel scroll refs and index counters for right-to-left scrolling
  const availableScrollRef = useRef<HTMLDivElement>(null);
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0);

  const ongoingScrollRef = useRef<HTMLDivElement>(null);
  const [currentOngoingIndex, setCurrentOngoingIndex] = useState(0);

  // Combined tasks
  const displayedAvailableTasks = [
    ...availableTasks,
    ...localAvailableSamples.filter(s => !ignoredTaskIds.includes(s.id))
  ];

  const displayedOngoingTasks = [
    ...activeTasks,
    ...localOngoingSamples
  ];

  // Scroll handlers for Available Tasks
  const handleAvailableScroll = () => {
    if (availableScrollRef.current) {
      const { scrollLeft } = availableScrollRef.current;
      const cardWidth = 325;
      const newIndex = Math.min(
        Math.max(0, Math.round(scrollLeft / cardWidth)),
        displayedAvailableTasks.length - 1
      );
      setCurrentAvailableIndex(newIndex);
    }
  };

  const scrollAvailable = (direction: 'left' | 'right') => {
    if (availableScrollRef.current) {
      const offset = direction === 'left' ? -325 : 325;
      availableScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      const targetIdx = direction === 'left' 
        ? Math.max(0, currentAvailableIndex - 1)
        : Math.min(displayedAvailableTasks.length - 1, currentAvailableIndex + 1);
      setCurrentAvailableIndex(targetIdx);
    }
  };

  // Scroll handlers for Ongoing Tasks
  const handleOngoingScroll = () => {
    if (ongoingScrollRef.current) {
      const { scrollLeft } = ongoingScrollRef.current;
      const cardWidth = 325;
      const newIndex = Math.min(
        Math.max(0, Math.round(scrollLeft / cardWidth)),
        displayedOngoingTasks.length - 1
      );
      setCurrentOngoingIndex(newIndex);
    }
  };

  const scrollOngoing = (direction: 'left' | 'right') => {
    if (ongoingScrollRef.current) {
      const offset = direction === 'left' ? -325 : 325;
      ongoingScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      const targetIdx = direction === 'left' 
        ? Math.max(0, currentOngoingIndex - 1)
        : Math.min(displayedOngoingTasks.length - 1, currentOngoingIndex + 1);
      setCurrentOngoingIndex(targetIdx);
    }
  };

  // Toggle offered service category
  const toggleServiceOffering = (serviceName: string) => {
    let updated: string[];
    if (proServices.includes(serviceName)) {
      if (proServices.length <= 1) {
        toast.error("You must offer at least one service category");
        return;
      }
      updated = proServices.filter(s => s !== serviceName);
    } else {
      updated = [...proServices, serviceName];
    }
    setProServices(updated);
    localStorage.setItem(`pro_services_${user.uid}`, JSON.stringify(updated));
    toast.success(`Service offerings updated`);
  };

  useEffect(() => {
    if (!user.uid) return;

    // 1. Fetch Available (Pending) Tasks from Firestore
    const qPending = query(
      collection(db, 'serviceRequests'),
      where('status', '==', 'pending')
    );

    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;

      const tasks = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
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
            id: docSnapshot.id,
            ...data,
            service: data.serviceType || 'General Task',
            price: data.providerPrice || data.budget || 2500,
            createdAt: createdAt,
            isExpired,
            time: data.urgency === "Emergency" ? "ASAP" : "Scheduled",
            scheduledTime: data.scheduledDate ? `${data.scheduledDate} • ${data.scheduledTime || 'Prompt Arrival'}` : 'Today • Within 1 Hour'
          };
        })
        .filter(t => !ignoredTaskIds.includes(t.id) && !t.isExpired)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setAvailableTasks(tasks);
    }, (err) => {
      console.warn("Could not list pending tasks:", err);
    });

    // 2. Fetch Active Tasks from Firestore
    const qActive = query(
      collection(db, 'serviceRequests'),
      where('status', 'in', ['assigned', 'in-progress']),
      where('providerId', '==', user.uid)
    );

    const unsubActive = onSnapshot(qActive, (snapshot) => {
      const jobs = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        service: docSnapshot.data().serviceType || 'Active Job',
        price: docSnapshot.data().providerPrice || docSnapshot.data().budget || 3000,
        status: docSnapshot.data().status || 'in-progress',
        scheduledTime: docSnapshot.data().scheduledTime || '4th October, Sunday 4pm',
        location: docSnapshot.data().location || 'Kilimani, Nairobi'
      }));
      setActiveTasks(jobs);
    }, (err) => {
      console.warn("Could not list active tasks:", err);
    });

    return () => {
      unsubPending();
      unsubActive();
    };
  }, [user.uid, ignoredTaskIds]);

  const handleAcceptTask = async (task: any) => {
    // If it is a sample task
    if (task.id.startsWith('avail_sample_')) {
      setLocalAvailableSamples(prev => prev.filter(t => t.id !== task.id));
      setLocalOngoingSamples(prev => [
        {
          ...task,
          id: `active_${task.id}`,
          status: 'in-progress',
          scheduledTime: task.scheduledTime || 'Today • Within 1 Hour',
          clientPhone: task.clientPhone || '+254 700 000 000'
        },
        ...prev
      ]);
      toast.success(`Accepted ${task.service}! Moved to Ongoing Tasks.`);
      setActiveTab('active');
      return;
    }

    try {
      const taskRef = doc(db, 'serviceRequests', task.id);
      await updateDoc(taskRef, {
        status: 'assigned',
        providerId: user.uid,
        providerName: user.displayName || 'Service Provider',
        acceptedAt: new Date().toISOString()
      });
      toast.success("Task accepted! Redirecting to chat...");
      navigate(`/chat/${task.id}`);
    } catch (err) {
      console.error("Error accepting task:", err);
      toast.success("Task accepted locally!");
    }
  };

  const handleDeclineTask = (task: any) => {
    const newIgnored = [...ignoredTaskIds, task.id];
    setIgnoredTaskIds(newIgnored);
    localStorage.setItem(`ignored_tasks_${user.uid}`, JSON.stringify(newIgnored));
    
    if (task.id.startsWith('avail_sample_')) {
      setLocalAvailableSamples(prev => prev.filter(t => t.id !== task.id));
    } else {
      setAvailableTasks(prev => prev.filter(t => t.id !== task.id));
    }
    toast.info("Task declined.");
  };

  const handleCompleteTask = async (task: any) => {
    // Add to task history sheet
    const newHistoryItem: CompletedTaskHistoryItem = {
      id: `comp_${Date.now()}`,
      refCode: task.refCode || `ACT-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      service: task.service,
      description: task.description || 'Service satisfactorily performed and confirmed with client',
      client: task.clientName || 'Private Client',
      clientPhone: task.clientPhone || '+254 7xx xxx xxx',
      location: task.location || 'Nairobi, Kenya',
      mpesaReceipt: `QJK${Math.floor(10000 + Math.random() * 90000)}M${Math.floor(1 + Math.random() * 9)}`,
      price: task.price || 3000,
      rating: 5.0,
      status: 'settled'
    };

    setTaskHistory(prev => [newHistoryItem, ...prev]);

    if (task.id.startsWith('active_sample_') || task.id.startsWith('active_avail_sample_') || task.id.startsWith('active_')) {
      setLocalOngoingSamples(prev => prev.filter(t => t.id !== task.id));
      toast.success(`Task completed! KES ${task.price?.toLocaleString()} credited to your wallet balance.`);
      return;
    }

    try {
      const taskRef = doc(db, 'serviceRequests', task.id);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      toast.success("Task marked as completed! Credited to your Task History.");
    } catch (err) {
      console.error("Error completing task:", err);
      toast.success("Task completed!");
    }
  };

  const totalEarningsKes = taskHistory.reduce((acc, curr) => acc + curr.price, 0);

  // Download Single Task Official Receipt / Remittance Slip
  const handleDownloadTaskReceipt = (task: CompletedTaskHistoryItem) => {
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
      doc.text('PROVIDER EARNINGS REMITTANCE VOUCHER', 14, 27);
      
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
      doc.text('SERVICE PROVIDER (PAYEE)', 14, 54);
      doc.text('CLIENT DETAILS (PAYER)', 110, 54);

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(user.displayName || 'Certified Pro', 14, 61);
      doc.text(task.client, 110, 61);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Phone / M-Pesa: ${user.phone || '+254 7xx xxx xxx'}`, 14, 67);
      doc.text(`Provider ID: ${user.uid || 'pro_verified_001'}`, 14, 73);
      doc.text(`Client Contact: ${task.clientPhone}`, 110, 67);
      doc.text(`Service Location: ${task.location}`, 110, 73);

      // Receipt details table
      doc.autoTable({
        startY: 82,
        head: [['Item Description', 'Service Category', 'M-Pesa Code', 'Payout (KES)']],
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
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        }
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      // Settlement Summary Box
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(14, finalY, 182, 38, 3, 3, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(14, finalY, 182, 38, 3, 3, 'D');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('SETTLEMENT DETAILS', 20, finalY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Payment Channel:', 20, finalY + 16);
      doc.text('M-Pesa B2C Automated Remittance', 80, finalY + 16);

      doc.text('Client Rating Awarded:', 20, finalY + 22);
      doc.text(`${task.rating} / 5.0 (Verified Service Excellence)`, 80, finalY + 22);

      doc.text('Net Credited to Wallet:', 20, finalY + 28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 124, 65);
      doc.text(`KES ${task.price.toLocaleString()} (Paid & Settled)`, 80, finalY + 28);

      // Official Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Generated via Task Molly Kenya Verified Provider Workspace. Thank you for your trusted craft.', 14, 280);

      doc.save(`TaskMolly_Remittance_${task.refCode}.pdf`);
      toast.success(`Downloaded voucher for ${task.refCode}`);
    } catch (err) {
      console.error("Failed to generate voucher:", err);
      toast.error("Could not generate receipt PDF");
    }
  };

  // Download Complete Task History PDF Statement
  const handleDownloadPDFStatement = () => {
    try {
      const doc = new jsPDF() as any;

      // Header Banner
      doc.setFillColor(26, 29, 32);
      doc.rect(0, 0, 210, 42, 'F');

      // Logo & Title
      doc.setTextColor(212, 160, 23);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TASK MOLLY KENYA', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('PROVIDER EARNINGS & TASK HISTORY STATEMENT', 14, 27);

      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(`Statement Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, 14, 35);
      doc.text(`Total Tasks Reconciled: ${taskHistory.length}`, 140, 35);

      // Provider Info
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('PROVIDER ACCOUNT:', 14, 52);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`${user.displayName || 'Certified Service Provider'} (${user.phone || '+254 7xx xxx xxx'})`, 55, 52);

      // Table of all tasks
      const tableData = taskHistory.map((t) => [
        t.refCode,
        `${t.date}\n${t.time}`,
        t.service,
        t.client,
        t.location,
        t.mpesaReceipt,
        `KES ${t.price.toLocaleString()}`,
        'Settled'
      ]);

      doc.autoTable({
        startY: 58,
        head: [['Ref Code', 'Date', 'Service Name', 'Client', 'Location', 'M-Pesa Code', 'Payout', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 29, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`Total Lifetime Reconciled Payout: KES ${totalEarningsKes.toLocaleString()}`, 14, finalY);

      doc.save(`TaskMolly_Provider_Statement_${Date.now()}.pdf`);
      toast.success("Downloaded Provider Task History Statement PDF");
    } catch (err) {
      console.error("Statement PDF error:", err);
      toast.error("Could not download statement PDF");
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-primary-bg pt-5 md:pt-6 pb-3 px-3 md:px-6 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-between overflow-hidden">
        
        {/* Header: Pro Dashboard Title Centered */}
        <div className="flex items-center justify-center mb-2 pb-2 border-b border-warm-gray/40 shrink-0 text-center">
          <h1 className="text-xl md:text-2xl font-black text-rich-black tracking-tight">
            Pro <span className="text-accent-gold">Dashboard</span>
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar shrink-0 mb-2">
          {/* Tab 1: Available Tasks */}
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'available'
                ? 'bg-rich-black text-white shadow-md'
                : 'bg-white text-rich-black/60 border border-warm-gray hover:border-accent-gold'
            }`}
          >
            <span>Available Tasks</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'available' ? 'bg-accent-gold text-white font-bold' : 'bg-warm-gray text-rich-black/60'}`}>
              {displayedAvailableTasks.length}
            </span>
          </button>

          {/* Tab 2: Ongoing Tasks */}
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-rich-black text-white shadow-md'
                : 'bg-white text-rich-black/60 border border-warm-gray hover:border-accent-gold'
            }`}
          >
            <span>Ongoing Tasks</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-accent-gold text-white font-bold' : 'bg-warm-gray text-rich-black/60'}`}>
              {displayedOngoingTasks.length}
            </span>
          </button>

          {/* Tab 3: Task History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-rich-black text-white shadow-md'
                : 'bg-white text-rich-black/60 border border-warm-gray hover:border-accent-gold'
            }`}
          >
            <span>Task History</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-accent-gold text-white font-bold' : 'bg-warm-gray text-rich-black/60'}`}>
              {taskHistory.length}
            </span>
          </button>

          {/* Tab 4: Offered Categories */}
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'services'
                ? 'bg-rich-black text-white shadow-md'
                : 'bg-white text-rich-black/60 border border-warm-gray hover:border-accent-gold'
            }`}
          >
            <span>Offered Categories</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'services' ? 'bg-accent-gold text-white font-bold' : 'bg-warm-gray text-rich-black/60'}`}>
              {proServices.length}
            </span>
          </button>
        </div>

        {/* Tab 1 Content: Available Tasks - Scrollable Right to Left */}
        {activeTab === 'available' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Top controls: Numbering before arrows */}
            <div className="flex items-center justify-end px-1 mb-1.5 shrink-0">
              {displayedAvailableTasks.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full border border-warm-gray/60">
                  <span className="text-[10px] md:text-[11px] font-black text-rich-black">
                    {currentAvailableIndex + 1}
                  </span>
                  <span className="text-[9px] text-rich-black/40 font-bold">/</span>
                  <span className="text-[9px] text-rich-black/40 font-bold">
                    {displayedAvailableTasks.length}
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => scrollAvailable('left')}
                      className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                      title="Previous Task"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      onClick={() => scrollAvailable('right')}
                      className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                      title="Next Task"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {displayedAvailableTasks.length > 0 ? (
              <div 
                ref={availableScrollRef}
                onScroll={handleAvailableScroll}
                className="flex-1 min-h-0 flex gap-3 overflow-x-auto pb-1 pt-0.5 px-0.5 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {displayedAvailableTasks.map((task) => (
                  <div
                    key={task.id}
                    className="w-[280px] sm:w-[310px] shrink-0 snap-start bg-white border border-warm-gray hover:border-accent-gold/50 rounded-2xl p-3.5 shadow-sm transition-all flex flex-col justify-between group hover:shadow-md"
                  >
                    <div>
                      {/* Card Header: Icon & Full Task Name */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center text-accent-gold border border-warm-gray/60 shrink-0">
                          {getServiceIcon(task.service)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-accent-gold block leading-tight">
                            {task.refCode}
                          </span>
                          <h3 className="text-xs md:text-sm font-bold text-rich-black leading-snug line-clamp-2">
                            {task.service}
                          </h3>
                        </div>
                      </div>

                      {/* Prominent Scheduled Time Placard */}
                      <div className="mb-2 p-2 bg-neutral-50/90 rounded-xl border border-warm-gray/60 group-hover:border-accent-gold/40 transition-colors">
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <Clock size={11} className="text-accent-gold shrink-0" />
                            <span className="text-[8px] uppercase tracking-widest font-black text-accent-gold truncate">
                              Scheduled Arrival
                            </span>
                          </div>
                          <span className={`text-[8px] uppercase font-black px-1.5 py-0.2 rounded-full ${
                            task.time === 'ASAP' 
                              ? 'bg-red-500/15 text-red-600 border border-red-200' 
                              : 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                          }`}>
                            {task.time || 'ASAP'}
                          </span>
                        </div>
                        <p className="text-xs font-black text-rich-black leading-tight">
                          {task.scheduledTime || 'Today • Within 1 Hour'}
                        </p>
                      </div>

                      {/* Client Info & Location (Service cost removed) */}
                      <div className="space-y-0.5 mb-2">
                        {task.clientName && (
                          <p className="text-[11px] text-rich-black/70 font-medium truncate">
                            Client: <span className="font-bold text-rich-black">{task.clientName}</span>
                          </p>
                        )}
                        <div className="flex items-center text-[11px] text-rich-black/60 pt-0.5">
                          <MapPin size={11} className="text-accent-gold shrink-0 mr-1" />
                          <span className="font-semibold text-rich-black/80 truncate">{task.location || 'Nairobi Area'}</span>
                        </div>
                      </div>

                      {/* Description Quote */}
                      {task.description && (
                        <p className="text-[11px] text-rich-black/60 italic leading-snug bg-primary-bg p-2 rounded-lg border border-warm-gray/40 line-clamp-2 mb-2">
                          "{task.description}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Chat with Client + Accept / Pass */}
                    <div className="space-y-1.5 pt-1.5 border-t border-warm-gray/30 w-full shrink-0">
                      <button
                        onClick={() => {
                          if (task.clientPhone) {
                            window.open(`https://wa.me/${task.clientPhone.replace(/\D/g, '')}`, '_blank');
                          } else {
                            navigate(`/chat/${task.id}`);
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-xl border border-warm-gray hover:border-accent-gold text-xs font-bold text-rich-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs bg-white hover:bg-neutral-50 active:scale-98"
                      >
                        <MessageSquare size={13} className="text-accent-gold" />
                        <span>Chat with Client</span>
                      </button>

                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => handleAcceptTask(task)}
                          className="flex-1 py-2 px-3 rounded-xl bg-rich-black hover:bg-black text-accent-gold text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer text-center"
                        >
                          Accept Job
                        </button>
                        <button
                          onClick={() => handleDeclineTask(task)}
                          className="py-2 px-3 rounded-xl border border-warm-gray text-xs font-bold text-rich-black/60 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer text-center"
                        >
                          Pass
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-0 bg-white border border-dashed border-warm-gray rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                <Activity size={28} className="text-rich-black/20 mb-2" />
                <h3 className="text-sm font-bold text-rich-black">No Available Tasks Right Now</h3>
                <p className="text-[11px] text-rich-black/40 mt-1 max-w-sm">
                  New incoming client requests in your area will appear here automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Ongoing Tasks - Scrollable Right to Left */}
        {activeTab === 'active' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Top controls: Numbering before arrows */}
            <div className="flex items-center justify-between px-1 mb-1.5 shrink-0">
              <div className="text-left">
                <h2 className="text-xs md:text-sm font-bold text-rich-black">Ongoing Tasks & Dispatches</h2>
                <p className="text-[10px] md:text-[11px] text-rich-black/40">Manage your active jobs and client communications</p>
              </div>

              {displayedOngoingTasks.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full border border-warm-gray/60">
                  <span className="text-[10px] md:text-[11px] font-black text-rich-black">
                    {currentOngoingIndex + 1}
                  </span>
                  <span className="text-[9px] text-rich-black/40 font-bold">/</span>
                  <span className="text-[9px] text-rich-black/40 font-bold">
                    {displayedOngoingTasks.length}
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => scrollOngoing('left')}
                      className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                      title="Previous Task"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      onClick={() => scrollOngoing('right')}
                      className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                      title="Next Task"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {displayedOngoingTasks.length > 0 ? (
              <div 
                ref={ongoingScrollRef}
                onScroll={handleOngoingScroll}
                className="flex-1 min-h-0 flex gap-3 overflow-x-auto pb-1 pt-0.5 px-0.5 scroll-smooth snap-x snap-mandatory no-scrollbar items-stretch"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {displayedOngoingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="w-[280px] sm:w-[310px] shrink-0 snap-start bg-white border border-warm-gray hover:border-accent-gold/50 rounded-2xl p-3.5 shadow-sm transition-all flex flex-col justify-between group hover:shadow-md"
                  >
                    <div>
                      {/* Card Header: Icon & Full Task Name */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center text-accent-gold border border-warm-gray/60 shrink-0">
                          {getServiceIcon(task.service)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-accent-gold block leading-tight">
                            {task.refCode}
                          </span>
                          <h3 className="text-xs md:text-sm font-bold text-rich-black leading-snug line-clamp-2">
                            {task.service}
                          </h3>
                        </div>
                      </div>

                      {/* Prominent Scheduled Arrival Time */}
                      <div className="mb-2 p-2 bg-neutral-50/90 rounded-xl border border-warm-gray/60 group-hover:border-accent-gold/40 transition-colors">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Clock size={11} className="text-accent-gold shrink-0" />
                          <span className="text-[8px] uppercase tracking-widest font-black text-accent-gold">
                            Scheduled Arrival Time
                          </span>
                        </div>
                        <p className="text-xs font-black text-rich-black leading-tight">
                          {task.scheduledTime || '4th October, Sunday 4pm'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-1.5 mb-2 bg-green-50/60 border border-green-200/60 px-2 py-0.5 rounded-lg w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                          {task.status === 'in-progress' ? 'In Progress' : 'Assigned & Dispatched'}
                        </span>
                      </div>

                      {/* Client Info & Location (Service cost removed) */}
                      <div className="space-y-0.5 mb-2">
                        <p className="text-[11px] text-rich-black/70 font-medium truncate">
                          Client: <span className="font-bold text-rich-black">{task.clientName || 'Private Client'}</span>
                        </p>
                        {task.clientPhone && (
                          <p className="text-[10px] font-mono text-rich-black/50">
                            Phone: {task.clientPhone}
                          </p>
                        )}
                        <div className="flex items-center text-[11px] text-rich-black/60 pt-0.5">
                          <MapPin size={11} className="text-accent-gold shrink-0 mr-1" />
                          <span className="font-semibold text-rich-black/80 truncate">{task.location || 'Kilimani, Nairobi'}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-[11px] text-rich-black/60 italic leading-snug bg-primary-bg p-2 rounded-lg border border-warm-gray/40 line-clamp-2 mb-2">
                          "{task.description}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Chat with Client & Mark Complete */}
                    <div className="space-y-1.5 pt-1.5 border-t border-warm-gray/30 w-full shrink-0">
                      <button
                        onClick={() => {
                          if (task.clientPhone) {
                            window.open(`https://wa.me/${task.clientPhone.replace(/\D/g, '')}`, '_blank');
                          } else {
                            navigate(`/chat/${task.id}`);
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-xl border border-warm-gray hover:border-accent-gold text-xs font-bold text-rich-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs bg-white hover:bg-neutral-50 active:scale-98"
                      >
                        <MessageSquare size={13} className="text-accent-gold" />
                        <span>Chat with Client</span>
                      </button>

                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer text-center active:scale-98"
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-0 bg-white border border-dashed border-warm-gray rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                <CheckCircle size={28} className="text-rich-black/20 mb-2" />
                <h3 className="text-sm font-bold text-rich-black">No Active Tasks</h3>
                <p className="text-[11px] text-rich-black/40 mt-1 max-w-sm">
                  Accept a new task from the "Available Tasks" tab to start servicing clients.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3 Content: Task History */}
        {activeTab === 'history' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div>
                <h2 className="text-xs md:text-sm font-bold text-rich-black">Task History</h2>
                <p className="text-[10px] md:text-[11px] text-rich-black/40">Verified completed jobs, ratings, and official remittance vouchers</p>
              </div>
            </div>

            {/* Statement Itemized Ledger Table (Sheet like Client View) */}
            <div className="flex-1 min-h-0 bg-white border border-warm-gray rounded-2xl overflow-auto shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-primary-bg/70 border-b border-warm-gray/60 text-[10px] uppercase tracking-wider font-black text-rich-black/50 sticky top-0 bg-primary-bg">
                    <th className="py-2.5 px-3">Ref Code</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Service & Context</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">M-Pesa Receipt</th>
                    <th className="py-2.5 px-3 text-right">Payout (KES)</th>
                    <th className="py-2.5 px-3 text-center">Rating</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-gray/30 text-rich-black font-medium">
                  {taskHistory.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-primary-bg/20'}>
                      <td className="py-2 px-3 font-mono font-bold text-accent-gold whitespace-nowrap">
                        {item.refCode}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-rich-black/70">
                        <div>{item.date}</div>
                        <div className="text-[9px] text-rich-black/40">{item.time}</div>
                      </td>
                      <td className="py-2 px-3 max-w-[200px]">
                        <div className="font-bold text-rich-black truncate">{item.service}</div>
                        <div className="text-[9px] text-rich-black/50 truncate italic">{item.description}</div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-semibold text-rich-black">{item.client}</div>
                        <div className="text-[9px] text-rich-black/40 font-mono">{item.clientPhone}</div>
                      </td>
                      <td className="py-2 px-3 text-rich-black/60 whitespace-nowrap">
                        {item.location}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-rich-black/50 whitespace-nowrap">
                        {item.mpesaReceipt}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-rich-black whitespace-nowrap">
                        KES {item.price.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-neutral-50 text-accent-gold border border-warm-gray/60">
                          <Star size={10} fill="currentColor" />
                          <span>{item.rating}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Settled ✓
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadTaskReceipt(item)}
                          className="px-2 py-1 bg-primary-bg hover:bg-rich-black hover:text-accent-gold border border-warm-gray hover:border-rich-black text-rich-black rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 group"
                          title={`Download voucher for ${item.refCode}`}
                        >
                          <Download size={11} className="text-accent-gold group-hover:text-accent-gold" />
                          <span>Voucher</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-bg/90 border-t border-warm-gray text-rich-black font-bold sticky bottom-0">
                    <td colSpan={7} className="py-2.5 px-3 text-left text-xs uppercase tracking-wider text-rich-black/60">
                      Completed ({taskHistory.length} Jobs Settled)
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] font-bold text-accent-gold">4.96 ★</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[9px] font-black text-emerald-700 uppercase">Paid in Full</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[9px] text-rich-black/40 font-mono">{taskHistory.length} Vouchers</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4 Content: Offered Categories */}
        {activeTab === 'services' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-4 gap-2.5 p-0.5">
              {ALL_AVAILABLE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = proServices.some(s => s.toLowerCase().includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(s.toLowerCase()));

                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleServiceOffering(cat.name)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-accent-gold/10 border-accent-gold shadow-sm'
                        : 'bg-white border-warm-gray/60 hover:border-warm-gray'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-accent-gold text-white' : 'bg-primary-bg text-rich-black/60'}`}>
                        <Icon size={16} />
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                        isSelected 
                          ? 'bg-accent-gold border-accent-gold text-white' 
                          : 'border-warm-gray text-transparent'
                      }`}>
                        ✓
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rich-black">{cat.name}</p>
                      <p className="text-[9px] text-rich-black/40 mt-0.5">
                        {isSelected ? 'Active & Receiving Requests' : 'Click to Activate'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="mt-2 pt-2 border-t border-warm-gray/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate('/provider-dashboard')}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-warm-gray hover:border-accent-gold rounded-full text-xs font-bold uppercase tracking-wider text-rich-black/70 hover:text-rich-black shadow-sm transition-all active:scale-95 group cursor-pointer"
          >
            <ArrowLeft size={14} className="text-rich-black/50 group-hover:text-accent-gold transition-colors" />
            <span>Back</span>
          </button>

          {activeTab === 'history' && (
            <button
              onClick={handleDownloadPDFStatement}
              className="flex items-center gap-2 px-4 py-1.5 bg-rich-black hover:bg-black text-white hover:text-accent-gold border border-rich-black hover:border-accent-gold/40 rounded-full text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 group cursor-pointer"
            >
              <Download size={14} className="text-accent-gold group-hover:scale-110 transition-transform" />
              <span>Download History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
