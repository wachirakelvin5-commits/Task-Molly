import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronDown, 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  DollarSign, 
  Send, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Droplet, 
  Hammer, 
  Paintbrush, 
  Leaf, 
  Truck, 
  WashingMachine, 
  Wrench, 
  Bug, 
  Wind, 
  User, 
  Phone,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export interface TaskServiceOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  popular?: boolean;
}

// All service task types available on Task Molly
export const ALL_TASK_SERVICES: TaskServiceOption[] = [
  // Domestic & Cleaning
  { id: 'mama_fua', name: 'Mama Fua & Laundry Care', category: 'Cleaning & Domestic', basePrice: 1800, popular: true },
  { id: 'home_cleaning', name: 'Home Cleaning & Deep Scrub', category: 'Cleaning & Domestic', basePrice: 3500, popular: true },
  { id: 'carpet_cleaning', name: 'Carpet & Sofa Steam Cleaning', category: 'Cleaning & Domestic', basePrice: 2800 },
  { id: 'water_tank_clean', name: 'Water Tank Scrubbing & Disinfection', category: 'Cleaning & Domestic', basePrice: 3000 },
  { id: 'cook_meal', name: 'Cook / In-Home Meal Preparation', category: 'Cleaning & Domestic', basePrice: 2500 },
  { id: 'babysitting', name: 'Babysitting & Child Care', category: 'Cleaning & Domestic', basePrice: 2000 },
  { id: 'car_wash', name: 'Car Wash (Home Service Detailing)', category: 'Cleaning & Domestic', basePrice: 1500 },

  // Plumbing & Drainage
  { id: 'plumbing_leak', name: 'Plumbing & Pipe Leak Repair', category: 'Plumbing & Water', basePrice: 2500, popular: true },
  { id: 'tap_sink', name: 'Tap, Sink & Shower Mixer Replacement', category: 'Plumbing & Water', basePrice: 2200 },
  { id: 'drain_unblock', name: 'Blocked Drain & Toilet Unclogging', category: 'Plumbing & Water', basePrice: 2800, popular: true },
  { id: 'tank_valve', name: 'Rooftop Water Tank Ball Valve Fix', category: 'Plumbing & Water', basePrice: 2600 },
  { id: 'solar_water', name: 'Solar Water Heater Installation & Repair', category: 'Plumbing & Water', basePrice: 4800 },

  // Electrical & Solar
  { id: 'electrical_repair', name: 'Electrician & Circuit Breaker Repair', category: 'Electrical & Solar', basePrice: 2800, popular: true },
  { id: 'instant_shower', name: 'Instant Shower 7.5kW Wiring & Fitting', category: 'Electrical & Solar', basePrice: 3200, popular: true },
  { id: 'solar_inverter', name: 'Solar Backup Inverter & Battery Hookup', category: 'Electrical & Solar', basePrice: 5000, popular: true },
  { id: 'security_cctv', name: 'Security & CCTV Camera Setup', category: 'Electrical & Solar', basePrice: 4500 },

  // Fundi, Handyman & Appliances
  { id: 'fundi_general', name: 'Fundi / General Handyman Fixes', category: 'Repairs & Fundi', basePrice: 2200, popular: true },
  { id: 'carpenter', name: 'Carpenter & Door Lock Fitting', category: 'Repairs & Fundi', basePrice: 2600 },
  { id: 'tv_mounting', name: 'TV Mounting & Wall Bracket Setup', category: 'Repairs & Fundi', basePrice: 2000 },
  { id: 'appliance_repair', name: 'Appliance Repair (Washing Machine / Fridge)', category: 'Repairs & Fundi', basePrice: 3400, popular: true },
  { id: 'gas_cooker', name: 'Gas Technician & Cooker Oven Service', category: 'Repairs & Fundi', basePrice: 2500 },

  // Outdoor, Relocation & Property
  { id: 'gardening', name: 'Gardener & Compound Landscaping', category: 'Outdoor & Relocation', basePrice: 3200, popular: true },
  { id: 'house_painting', name: 'House Painting & Wall Skimming', category: 'Outdoor & Relocation', basePrice: 4200 },
  { id: 'movers', name: 'Movers & House Relocation', category: 'Outdoor & Relocation', basePrice: 6500 },
  { id: 'pest_control', name: 'Pest Control & Full House Fumigation', category: 'Outdoor & Relocation', basePrice: 3800 },
  { id: 'internet_tv', name: 'Internet & TV Cable Installation', category: 'Outdoor & Relocation', basePrice: 2500 },
  { id: 'errand_runner', name: 'Errand Runner & Concierge Service', category: 'Outdoor & Relocation', basePrice: 1500 },
  { id: 'waste_collection', name: 'Waste Collection & Bulky Junk Pickup', category: 'Outdoor & Relocation', basePrice: 2400 }
];

// Service icon helper
const getServiceIcon = (name: string) => {
  const t = name.toLowerCase();
  if (t.includes('electr') || t.includes('solar') || t.includes('inverter') || t.includes('breaker')) return <Zap size={18} />;
  if (t.includes('plumb') || t.includes('water') || t.includes('pipe') || t.includes('leak') || t.includes('tap') || t.includes('drain')) return <Droplet size={18} />;
  if (t.includes('clean') || t.includes('wash') || t.includes('laundry') || t.includes('mama fua')) return <WashingMachine size={18} />;
  if (t.includes('paint')) return <Paintbrush size={18} />;
  if (t.includes('garden') || t.includes('landscap') || t.includes('lawn')) return <Leaf size={18} />;
  if (t.includes('move') || t.includes('relocat')) return <Truck size={18} />;
  if (t.includes('pest') || t.includes('fumigat')) return <Bug size={18} />;
  if (t.includes('cctv') || t.includes('security')) return <ShieldCheck size={18} />;
  if (t.includes('ac') || t.includes('air')) return <Wind size={18} />;
  if (t.includes('appliance') || t.includes('gas')) return <Wrench size={18} />;
  return <Hammer size={18} />;
};

const POPULAR_NEIGHBORHOODS = [
  'Kilimani',
  'Westlands',
  'Kileleshwa',
  'Lavington',
  'Karen',
  'South C',
  'South B',
  'Parklands',
  'Roysambu',
  'Lang\'ata',
  'Runda',
  'Ngong Road'
];

interface TaskRequestModalProps {
  onClose: () => void;
  initialService?: string;
}

export default function TaskRequestModal({ onClose, initialService }: TaskRequestModalProps) {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Selected Service
  const [selectedService, setSelectedService] = useState<TaskServiceOption | null>(() => {
    if (initialService) {
      const match = ALL_TASK_SERVICES.find(s => s.name.toLowerCase().includes(initialService.toLowerCase()));
      if (match) return match;
    }
    return ALL_TASK_SERVICES[0]; // Default to Mama Fua
  });

  // Services Dropdown state
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [taskDescription, setTaskDescription] = useState('');
  const [urgency, setUrgency] = useState<'ASAP' | 'Emergency' | 'Scheduled'>('ASAP');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState('10:00 AM');
  
  // Location
  const [neighborhood, setNeighborhood] = useState('Kilimani');
  const [specificAddress, setSpecificAddress] = useState('Chania Ave');

  // Contact
  const [clientName, setClientName] = useState(() => currentUser?.displayName || '');
  const [clientPhone, setClientPhone] = useState(() => (currentUser as any)?.phoneNumber || '');
  
  // Budget
  const [budgetKes, setBudgetKes] = useState<number>(() => selectedService?.basePrice || 2500);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update budget suggestion when service changes
  const handleSelectService = (service: TaskServiceOption) => {
    setSelectedService(service);
    setBudgetKes(service.basePrice);
    setIsServicesDropdownOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsServicesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isServicesDropdownOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isServicesDropdownOpen]);

  // Categories list
  const categories = ['All', 'Cleaning & Domestic', 'Plumbing & Water', 'Electrical & Solar', 'Repairs & Fundi', 'Outdoor & Relocation'];

  // Filtered services
  const filteredServices = ALL_TASK_SERVICES.filter(service => {
    const matchesCategory = selectedCategoryFilter === 'All' || service.category === selectedCategoryFilter;
    const matchesSearch = service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService) {
      toast.error("Please click 'Services available' to choose a task type");
      return;
    }

    if (!taskDescription.trim()) {
      toast.error("Please provide a short description of what needs to be done");
      return;
    }

    if (!currentUser && (!clientName.trim() || !clientPhone.trim())) {
      toast.error("Please enter your name and phone number so the provider can reach you");
      return;
    }

    setIsSubmitting(true);

    const fullLocation = specificAddress.trim() 
      ? `${neighborhood}, ${specificAddress.trim()}` 
      : `${neighborhood}, Nairobi`;

    const formattedScheduledArrival = urgency === 'Scheduled'
      ? `${scheduledDate} • ${scheduledTimeSlot}`
      : urgency === 'Emergency'
        ? 'Emergency • Immediate Dispatch'
        : 'Today • Within 1-2 Hours';

    const syncId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const refCode = `REQ-2026-${Math.floor(100 + Math.random() * 900)}`;

    const requestPayload = {
      syncId,
      refCode,
      service: selectedService.name,
      serviceType: selectedService.name,
      description: taskDescription.trim(),
      urgency,
      scheduledTime: formattedScheduledArrival,
      scheduledDate: urgency === 'Scheduled' ? scheduledDate : 'Today',
      location: fullLocation,
      neighborhood,
      specificAddress: specificAddress.trim(),
      budget: Number(budgetKes) || selectedService.basePrice,
      clientPrice: Number(budgetKes) || selectedService.basePrice,
      providerPrice: Math.round((Number(budgetKes) || selectedService.basePrice) * 0.85),
      clientName: clientName.trim() || currentUser?.displayName || 'Client',
      clientPhone: clientPhone.trim() || (currentUser as any)?.phoneNumber || '+254 7xx xxx xxx',
      status: 'pending',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    try {
      if (!currentUser) {
        // Guest user: Save to session storage and redirect to auth to finalize
        sessionStorage.setItem('pending_service_request', JSON.stringify(requestPayload));
        toast.success("Task details saved! Log in or sign up to connect with matching pros.");
        setTimeout(() => {
          navigate('/auth?redirect=pending-task');
          onClose();
        }, 800);
        return;
      }

      // Logged in user: Write to Firestore serviceRequests
      await addDoc(collection(db, 'serviceRequests'), {
        clientId: currentUser.uid,
        ...requestPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Best effort notify API
      fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentUser.uid,
          ...requestPayload
        })
      }).catch(err => console.warn("API notification skipped:", err));

      toast.success(`Request for ${selectedService.name} posted successfully! Matching verified pros...`);
      setTimeout(() => {
        navigate('/tasks');
        onClose();
      }, 700);
    } catch (error) {
      console.error("Error creating request:", error);
      // Fallback: save to sessionStorage and open tasks
      sessionStorage.setItem('pending_service_request', JSON.stringify(requestPayload));
      toast.success("Task request logged locally. Redirecting to your tasks...");
      navigate('/tasks');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto no-scrollbar">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-rich-black/60 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative z-10 bg-white border border-warm-gray rounded-[2rem] shadow-2xl max-w-xl w-full p-5 sm:p-7 overflow-hidden max-h-[92vh] flex flex-col my-auto"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-warm-gray/40 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold block">
              TASK MOLLY CONCIERGE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-rich-black tracking-tight">
              Add Your <span className="text-accent-gold">Service Request</span>
            </h2>
            <p className="text-xs text-rich-black/50 mt-0.5">
              Fill in your task details to match with vetted, certified service providers in Nairobi.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-rich-black/60 hover:text-rich-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto no-scrollbar py-3 space-y-4 flex-1 pr-0.5">
          
          {/* SECTION 1: Clickable Dropdown Button labeled 'Services available' */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-rich-black/80 flex items-center gap-1.5">
                <span>Task Service Type</span>
                <span className="text-accent-gold font-bold">*</span>
              </label>
              <span className="text-[10px] font-bold text-accent-gold">
                {ALL_TASK_SERVICES.length} Task Types Available
              </span>
            </div>

            {/* THE CLICKABLE DROPDOWN BUTTON LABELED 'Services available' */}
            <button
              type="button"
              id="services-available-dropdown-btn"
              onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left shadow-2xs group cursor-pointer ${
                isServicesDropdownOpen
                  ? 'border-accent-gold bg-accent-gold/5 ring-2 ring-accent-gold/20'
                  : 'border-warm-gray hover:border-accent-gold/70 bg-primary-bg/50 hover:bg-neutral-50'
              }`}
              title="Click to view all services available"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-warm-gray/70 flex items-center justify-center text-accent-gold shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                  {selectedService ? getServiceIcon(selectedService.name) : <Sparkles size={18} />}
                </div>
                <div className="min-w-0">
                  {/* Explicit 'Services available' label */}
                  <span className="text-[10px] uppercase font-black tracking-wider text-accent-gold flex items-center gap-1">
                    <span>Services available</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
                  </span>
                  <p className="text-sm font-black text-rich-black truncate leading-tight">
                    {selectedService ? selectedService.name : 'Click to select from available services...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                {selectedService && (
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline">
                    Est. KES {selectedService.basePrice.toLocaleString()}
                  </span>
                )}
                <div className={`w-7 h-7 rounded-lg bg-white border border-warm-gray flex items-center justify-center text-rich-black/60 group-hover:text-accent-gold transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180 bg-accent-gold/10 text-accent-gold' : ''}`}>
                  <ChevronDown size={15} />
                </div>
              </div>
            </button>

            {/* Dropdown Menu Popup */}
            <AnimatePresence>
              {isServicesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-accent-gold/40 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[340px]"
                >
                  {/* Dropdown Search & Header */}
                  <div className="p-3 border-b border-warm-gray/50 bg-neutral-50/80 space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rich-black/40" />
                      <input
                        type="text"
                        placeholder="Search all 27+ services (e.g. plumbing, mama fua, electrician...)"
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-2 bg-white border border-warm-gray rounded-xl text-xs focus:outline-none focus:border-accent-gold text-rich-black placeholder:text-rich-black/40"
                      />
                    </div>

                    {/* Quick Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            selectedCategoryFilter === cat
                              ? 'bg-rich-black text-white shadow-2xs'
                              : 'bg-white text-rich-black/60 border border-warm-gray/60 hover:border-accent-gold'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dropdown Options List */}
                  <div className="overflow-y-auto p-2 divide-y divide-warm-gray/20 no-scrollbar">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => {
                        const isChosen = selectedService?.id === service.id;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleSelectService(service)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-accent-gold/15 text-rich-black font-black' 
                                : 'hover:bg-primary-bg/70 text-rich-black/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isChosen ? 'bg-accent-gold text-white' : 'bg-neutral-100 text-rich-black/60'}`}>
                                {getServiceIcon(service.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate leading-tight">
                                  {service.name}
                                </p>
                                <span className="text-[9px] text-rich-black/40 uppercase font-medium">
                                  {service.category}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                KES {service.basePrice.toLocaleString()}
                              </span>
                              {isChosen && (
                                <CheckCircle size={14} className="text-accent-gold shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-rich-black/50">
                        No service matching "{serviceSearchQuery}". Try another keyword.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 2: Task Description Details */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-rich-black/80 mb-1.5">
              Task Details & Requirements <span className="text-accent-gold font-bold">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe the job in detail (e.g., Kitchen sink pipe burst under the cupboard, need urgent replacement with brass fitting; or 3 baskets of laundry wash and steam ironing...)"
              className="w-full p-3 bg-primary-bg/40 border border-warm-gray rounded-2xl text-xs text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold transition-all resize-none leading-relaxed"
            />
          </div>

          {/* SECTION 3: Urgency / Timing */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-rich-black/80 mb-1.5">
              When do you need the service provider?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('ASAP')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'ASAP'
                    ? 'bg-rich-black text-white border-rich-black shadow-sm'
                    : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Clock size={12} className={urgency === 'ASAP' ? 'text-accent-gold' : 'text-rich-black/40'} />
                  <span>ASAP (Today)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('Emergency')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'Emergency'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-red-600/80 border-red-200 hover:border-red-400'
                }`}
              >
                <span>Emergency ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('Scheduled')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'Scheduled'
                    ? 'bg-rich-black text-white border-rich-black shadow-sm'
                    : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Calendar size={12} className={urgency === 'Scheduled' ? 'text-accent-gold' : 'text-rich-black/40'} />
                  <span>Scheduled</span>
                </div>
              </button>
            </div>

            {/* Scheduled specific date & arrival slot */}
            {urgency === 'Scheduled' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2.5 p-3 bg-neutral-50 rounded-2xl border border-warm-gray/60 space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-rich-black/60 uppercase mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-2 bg-white border border-warm-gray rounded-xl text-xs text-rich-black focus:outline-none focus:border-accent-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-rich-black/60 uppercase mb-1">
                      Arrival Time Slot
                    </label>
                    <select
                      value={scheduledTimeSlot}
                      onChange={(e) => setScheduledTimeSlot(e.target.value)}
                      className="w-full p-2 bg-white border border-warm-gray rounded-xl text-xs text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
                    >
                      <option value="08:30 AM">Morning (08:30 AM)</option>
                      <option value="10:00 AM">Morning (10:00 AM)</option>
                      <option value="01:00 PM">Afternoon (01:00 PM)</option>
                      <option value="04:00 PM">Evening (04:00 PM)</option>
                      <option value="06:00 PM">Evening (06:00 PM)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* SECTION 4: Location in Nairobi */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-rich-black/80 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-accent-gold" />
                <span>Service Location (Nairobi & Surrounding)</span>
              </span>
              <span className="text-[10px] font-normal text-rich-black/50">Same Client Home Address</span>
            </label>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full p-2.5 bg-primary-bg/50 border border-warm-gray rounded-xl text-xs font-bold text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
                  >
                    {POPULAR_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={specificAddress}
                    onChange={(e) => setSpecificAddress(e.target.value)}
                    placeholder="Street / Court / Apt (e.g. Chania Ave)"
                    className="w-full p-2.5 bg-primary-bg/50 border border-warm-gray rounded-xl text-xs text-rich-black focus:outline-none focus:border-accent-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Contact Details (For guests or update) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-rich-black/80 mb-1 flex items-center gap-1">
                <User size={11} className="text-accent-gold" />
                <span>Your Name</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Kelvin Wachira"
                className="w-full p-2.5 bg-primary-bg/50 border border-warm-gray rounded-xl text-xs text-rich-black focus:outline-none focus:border-accent-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-rich-black/80 mb-1 flex items-center gap-1">
                <Phone size={11} className="text-accent-gold" />
                <span>M-Pesa Phone Number</span>
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full p-2.5 bg-primary-bg/50 border border-warm-gray rounded-xl text-xs text-rich-black font-mono focus:outline-none focus:border-accent-gold"
              />
            </div>
          </div>

          {/* SECTION 6: Estimated Budget Guide */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-warm-gray/60 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-black text-rich-black/50 block">
                Estimated Task Budget
              </span>
              <p className="text-[11px] text-rich-black/60">
                Payment held securely until work is completed to your satisfaction
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-warm-gray shrink-0 shadow-2xs">
              <span className="text-xs font-bold text-rich-black/50">KES</span>
              <input
                type="number"
                min="500"
                step="100"
                value={budgetKes}
                onChange={(e) => setBudgetKes(Number(e.target.value))}
                className="w-20 text-sm font-black text-rich-black focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-rich-black hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={15} className="text-accent-gold" />
                  <span>Find Service Provider Now</span>
                  <ArrowRight size={14} className="text-accent-gold" />
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-rich-black/40 mt-1.5">
              Verified providers respond in an average of 8-15 minutes across Nairobi.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
