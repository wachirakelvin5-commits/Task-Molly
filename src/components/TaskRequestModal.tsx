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
  ArrowRight,
  Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { createServiceRequest } from '../lib/serviceRequests';
import { toast } from 'sonner';
import { savePendingRequest } from '../lib/pendingRequestService';

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
    return null;
  });

  // Services Dropdown state
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [taskDescription, setTaskDescription] = useState('');
  const [urgency, setUrgency] = useState<'ASAP' | 'Scheduled' | 'Custom'>('ASAP');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState('10:00 AM');
  
  // Custom Time fields
  const [customDate, setCustomDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [customTime, setCustomTime] = useState('14:00');

  // Format 24hr time to friendly 12hr AM/PM format
  const formatCustomTime = (timeStr: string) => {
    if (!timeStr) return 'Custom Time';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = String(m ?? 0).padStart(2, '0');
    return `${hour12}:${minStr} ${period}`;
  };
  
  // Location
  const [neighborhood, setNeighborhood] = useState('Kilimani');
  const [specificAddress, setSpecificAddress] = useState('Chania Ave');

  // Contact
  const [clientName, setClientName] = useState(() => currentUser?.displayName || '');
  const [clientPhone, setClientPhone] = useState(() => (currentUser as any)?.phoneNumber || '');
  
  // Budget
  const [budgetKes, setBudgetKes] = useState<number>(2500);

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
      : urgency === 'Custom'
      ? `${customDate} • ${formatCustomTime(customTime)}`
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
      scheduledDate: urgency === 'Scheduled' ? scheduledDate : (urgency === 'Custom' ? customDate : 'Today'),
      customTime: urgency === 'Custom' ? customTime : undefined,
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
        // Guest user: Save to persistent storage and redirect to auth to finalize
        savePendingRequest(requestPayload);
        toast.success("Task details saved! Log in or sign up to connect with matching pros.");
        setTimeout(() => {
          navigate('/auth?redirect=pending-task');
          onClose();
        }, 600);
        return;
      }

      await createServiceRequest(currentUser.uid, requestPayload);

      toast.success(`Request for ${selectedService.name} posted successfully! Matching verified pros...`);
      setTimeout(() => {
        navigate('/tasks');
        onClose();
      }, 700);
    } catch (error) {
      console.error("Error creating request:", error);
      // Fallback: save to storage and open tasks
      savePendingRequest(requestPayload);
      toast.success("Task request logged. Redirecting to your tasks...");
      navigate('/tasks');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-3 overflow-hidden">
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative z-10 bg-white border border-warm-gray rounded-[1.75rem] shadow-2xl max-w-xl w-full p-4 sm:p-5 overflow-hidden flex flex-col text-[0.875rem] -mt-3 sm:-mt-6"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-warm-gray/40 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black text-rich-black tracking-tight leading-tight">
              Add Your <span className="text-accent-gold">Service Request</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 text-rich-black/60 hover:text-rich-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Compact Form Body - Fits without scrolling */}
        <form onSubmit={handleSubmit} className="pt-2 space-y-2 flex-1">
          
          {/* SECTION 1: Clickable Dropdown Button labeled 'Services available' */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 flex items-center gap-1">
                <span>Task Service Type</span>
                <span className="text-accent-gold font-bold">*</span>
              </label>
            </div>

            {/* THE COMPACT CLICKABLE DROPDOWN BUTTON LABELED 'Services available' */}
            <button
              type="button"
              id="services-available-dropdown-btn"
              onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-left shadow-2xs group cursor-pointer ${
                isServicesDropdownOpen
                  ? 'border-accent-gold bg-accent-gold/5 ring-2 ring-accent-gold/20'
                  : 'border-warm-gray hover:border-accent-gold/70 bg-primary-bg/50 hover:bg-neutral-50'
              }`}
              title="Click to view all services available"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9.5px] uppercase font-black tracking-wider text-accent-gold flex items-center gap-1.5 shrink-0">
                  <span>Services available</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
                </span>
                {selectedService && (
                  <span className="text-[10.5px] font-bold text-rich-black truncate border-l border-warm-gray pl-2">
                    {selectedService.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-1.5">
                <div className={`w-4.5 h-4.5 rounded-md bg-white border border-warm-gray flex items-center justify-center text-rich-black/60 group-hover:text-accent-gold transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180 bg-accent-gold/10 text-accent-gold' : ''}`}>
                  <ChevronDown size={12} />
                </div>
              </div>
            </button>

            {/* Dropdown Menu Popup - showing list of all services available */}
            <AnimatePresence>
              {isServicesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-accent-gold/40 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[290px]"
                >
                  {/* Dropdown Search & Header */}
                  <div className="p-2 border-b border-warm-gray/50 bg-neutral-50/80 space-y-1">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rich-black/40" />
                      <input
                        type="text"
                        placeholder="Search all services available (e.g. plumbing, mama fua, electrician...)"
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-7 pr-2.5 py-1 bg-white border border-warm-gray rounded-lg text-[10.5px] focus:outline-none focus:border-accent-gold text-rich-black placeholder:text-rich-black/40"
                      />
                    </div>

                    {/* Quick Category Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
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
                  <div className="overflow-y-auto p-1 divide-y divide-warm-gray/20 no-scrollbar">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => {
                        const isChosen = selectedService?.id === service.id;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleSelectService(service)}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-accent-gold/15 text-rich-black font-black' 
                                : 'hover:bg-primary-bg/70 text-rich-black/80'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0 ${isChosen ? 'bg-accent-gold text-white' : 'bg-neutral-100 text-rich-black/60'}`}>
                                {getServiceIcon(service.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10.5px] font-bold truncate leading-tight">
                                  {service.name}
                                </p>
                                <span className="text-[8px] text-rich-black/40 uppercase font-medium">
                                  {service.category}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                KES {service.basePrice.toLocaleString()}
                              </span>
                              {isChosen && (
                                <CheckCircle size={12} className="text-accent-gold shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-[10.5px] text-rich-black/50">
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
            <label className="block text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 mb-0.5">
              Task Details & Requirements <span className="text-accent-gold font-bold">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe what you need done..."
              className="w-full p-2 bg-primary-bg/40 border border-warm-gray rounded-lg text-[10.5px] text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold transition-all resize-none leading-relaxed"
            />
          </div>

          {/* SECTION 3: Urgency / Timing */}
          <div>
            <label className="block text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 mb-0.5">
              When do you need the service provider?
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setUrgency('ASAP')}
                className={`py-1.5 px-1.5 rounded-lg text-[9.5px] font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'ASAP'
                    ? 'border-accent-gold bg-accent-gold/10 text-rich-black shadow-2xs font-black ring-1 ring-accent-gold/25'
                    : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold hover:text-rich-black'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Clock size={10} className={urgency === 'ASAP' ? 'text-accent-gold' : 'text-rich-black/40'} />
                  <span>ASAP (Today)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('Scheduled')}
                className={`py-1.5 px-1.5 rounded-lg text-[9.5px] font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'Scheduled'
                    ? 'border-accent-gold bg-accent-gold/10 text-rich-black shadow-2xs font-black ring-1 ring-accent-gold/25'
                    : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold hover:text-rich-black'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Calendar size={10} className={urgency === 'Scheduled' ? 'text-accent-gold' : 'text-rich-black/40'} />
                  <span>Scheduled</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('Custom')}
                className={`py-1.5 px-1.5 rounded-lg text-[9.5px] font-bold transition-all text-center border cursor-pointer ${
                  urgency === 'Custom'
                    ? 'border-accent-gold bg-accent-gold/10 text-rich-black shadow-2xs font-black ring-1 ring-accent-gold/25'
                    : 'bg-white text-rich-black/70 border-warm-gray hover:border-accent-gold hover:text-rich-black'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Timer size={10} className={urgency === 'Custom' ? 'text-accent-gold' : 'text-rich-black/40'} />
                  <span>Custom Time</span>
                </div>
              </button>
            </div>

            {/* Scheduled specific date & arrival slot */}
            {urgency === 'Scheduled' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-1.5 p-1.5 bg-neutral-50 rounded-lg border border-warm-gray/60 space-y-1"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-rich-black/60 uppercase mb-0.5">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-1 bg-white border border-warm-gray rounded-md text-[10px] text-rich-black focus:outline-none focus:border-accent-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-rich-black/60 uppercase mb-0.5">
                      Arrival Time Slot
                    </label>
                    <select
                      value={scheduledTimeSlot}
                      onChange={(e) => setScheduledTimeSlot(e.target.value)}
                      className="w-full p-1 bg-white border border-warm-gray rounded-md text-[10px] text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
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

            {/* Custom exact date & time picker */}
            {urgency === 'Custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-1.5 p-1.5 bg-neutral-50 rounded-lg border border-warm-gray/60 space-y-1"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-rich-black/60 uppercase mb-0.5">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full p-1 bg-white border border-warm-gray rounded-md text-[10px] text-rich-black focus:outline-none focus:border-accent-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-rich-black/60 uppercase mb-0.5">
                      Exact Time
                    </label>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full p-1 bg-white border border-warm-gray rounded-md text-[10px] text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-[9px] text-accent-gold font-bold text-right px-0.5">
                  Arrival: {customDate} at {formatCustomTime(customTime)}
                </div>
              </motion.div>
            )}
          </div>

          {/* SECTION 4: Location in Nairobi */}
          <div>
            <label className="block text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 mb-0.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin size={10} className="text-accent-gold" />
                <span>Client Home Address</span>
              </span>
            </label>

            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full p-1.5 bg-primary-bg/50 border border-warm-gray rounded-lg text-[10.5px] font-bold text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
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
                    className="w-full p-1.5 bg-primary-bg/50 border border-warm-gray rounded-lg text-[10.5px] text-rich-black focus:outline-none focus:border-accent-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 mb-0.5 flex items-center gap-1">
                <User size={9.5} className="text-accent-gold" />
                <span>Your Name</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Kelvin Wachira"
                className="w-full p-1.5 bg-primary-bg/50 border border-warm-gray rounded-lg text-[10.5px] text-rich-black focus:outline-none focus:border-accent-gold"
              />
            </div>

            <div>
              <label className="block text-[9.5px] font-black uppercase tracking-wider text-rich-black/80 mb-0.5 flex items-center gap-1">
                <Phone size={9.5} className="text-accent-gold" />
                <span>M-Pesa Phone Number</span>
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full p-1.5 bg-primary-bg/50 border border-warm-gray rounded-lg text-[10.5px] text-rich-black font-mono focus:outline-none focus:border-accent-gold"
              />
            </div>
          </div>

          {/* SECTION 6: Estimated Budget Guide */}
          <div className="p-2 bg-neutral-50 rounded-lg border border-warm-gray/60 flex items-center justify-between gap-2">
            <div>
              <span className="text-[8.5px] uppercase font-black text-rich-black/50 block">
                Estimated Task Budget
              </span>
              <p className="text-[9.5px] text-rich-black/60">
                Payment held securely until work is completed to your satisfaction
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-warm-gray shrink-0 shadow-2xs">
              <span className="text-[10px] font-bold text-rich-black/50">KES</span>
              <input
                type="number"
                min="500"
                step="100"
                value={budgetKes}
                onChange={(e) => setBudgetKes(Number(e.target.value))}
                className="w-14 text-[11px] font-black text-rich-black focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-lg bg-rich-black hover:bg-black text-white text-[10.5px] font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={12} className="text-accent-gold" />
                  <span>Find Service Provider Now</span>
                  <ArrowRight size={12} className="text-accent-gold" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
