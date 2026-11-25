import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, Search, Send, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { TIME_SLOTS, buildRequestPayload, localIsoDate, submitServiceRequest } from '../lib/requestForm';
import { toast } from 'sonner';
import { savePendingRequest } from '../lib/pendingRequestService';
import { REQUEST_SERVICES, ServiceItem, findService } from '../data/serviceCatalog';
import LocationAutocomplete, { LocationSelection } from './LocationAutocomplete';

// One look for every box on the request form (same height; the description box is taller).
const BOX = 'w-full px-3.5 py-3 bg-primary-bg/50 border border-warm-gray rounded-xl text-xs sm:text-sm text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold font-medium';

interface TaskRequestModalProps {
  onClose: () => void;
  initialService?: string;
  /** Pre-fills the first box (e.g. what was curated on the Premium page). */
  initialDescription?: string;
}

export default function TaskRequestModal({ onClose, initialService, initialDescription = '' }: TaskRequestModalProps) {
  const navigate = useNavigate();

  // Find initial service if provided
  const initialMatch = initialService
    ? findService(initialService)
      || REQUEST_SERVICES.find(s => s.name.toLowerCase().includes(initialService.toLowerCase()))
      || null
    : null;

  // Step state: 'selection' (options grid like image) | 'client-info' (client details form)
  const [step, setStep] = useState<'selection' | 'client-info'>(initialMatch ? 'client-info' : 'selection');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(initialMatch);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields for Client Information (NO AMOUNT)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Uber-like location autocomplete state
  const [locationData, setLocationData] = useState<LocationSelection>({
    fullAddress: '',
    neighborhood: 'Kilimani',
    specificAddress: ''
  });
  const [unitOrApartment, setUnitOrApartment] = useState('');

  const [taskDescription, setTaskDescription] = useState(initialDescription);

  // Scheduling (ASAP removed, schedule date kept)
  const [scheduledDate, setScheduledDate] = useState(() => localIsoDate());
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autofill client info if logged in
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (currentUser.displayName) setClientName(currentUser.displayName);
      if (currentUser.phoneNumber) setClientPhone(currentUser.phoneNumber);
    }
  }, []);

  const descriptionPrompt = selectedService?.descriptionPrompt || 'Task description';
  const isNotepad = !!selectedService?.notepad;

  const filteredServices = REQUEST_SERVICES.filter(service => {
    if (!searchQuery.trim()) return true;
    return service.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setStep('client-info');
  };

  const handleBackToSelection = () => {
    setStep('selection');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      toast.error('Please select a service');
      setStep('selection');
      return;
    }

    if (!taskDescription.trim()) {
      toast.error(isNotepad ? 'Please type your list' : `Please fill in: ${descriptionPrompt}`);
      return;
    }

    if (!clientName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!clientPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!locationData.fullAddress.trim() && !locationData.specificAddress.trim()) {
      toast.error('Please search and select your location in Nairobi');
      return;
    }

    setIsSubmitting(true);

    const requestPayload = buildRequestPayload({
      service: selectedService,
      customTitle: customTaskTitle,
      clientName,
      clientPhone,
      location: locationData,
      unitOrApartment,
      description: taskDescription,
      scheduledDate,
      scheduledTimeSlot,
    });

    try {
      const outcome = await submitServiceRequest(requestPayload);
      if (outcome === 'needs-login') {
        toast.success("Task details saved! Please log in to connect with matching verified pros.");
        onClose();
        navigate('/auth?redirect=pending-task');
        return;
      }
      toast.success(`Request for "${requestPayload.serviceType}" posted! Matching pros will see it shortly.`);
      onClose();
      navigate('/tasks');
    } catch (error) {
      // Kept in the browser; the Tasks page retries posting it.
      console.error("Error creating request:", error);
      savePendingRequest(requestPayload);
      toast.error("We couldn't post your request just now. We'll retry from your Tasks page.");
      onClose();
      navigate('/tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-rich-black/70 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.35 }}
        className="relative z-10 bg-primary-bg border border-warm-gray rounded-3xl sm:rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-warm-gray/60 shrink-0">
          <div className="flex items-center gap-3">
            {step === 'client-info' ? (
              <button
                type="button"
                onClick={handleBackToSelection}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rich-black/70 hover:text-accent-gold transition-colors py-1.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Services</span>
              </button>
            ) : (
              <h2 className="text-base sm:text-lg font-black text-rich-black tracking-tight">
                Add Your <span className="text-accent-gold">Service Request</span>
              </h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-accent-gold/15 text-accent-gold border border-accent-gold/30">
              {step === 'selection' ? 'Step 1: Choose Service' : 'Step 2: Client Info'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-rich-black/60 hover:text-rich-black flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: OPTIONS UNBOXED (EXACTLY 3 PER ROW, RETAINING IMAGE DESIGN) */}
            {step === 'selection' && (
              <motion.div
                key="step-selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Search Bar */}
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rich-black/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services (e.g. indoor cleaning, mama fua, repairs...)"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-gray rounded-2xl text-xs sm:text-sm text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* UNBOXED SERVICES GRID: 3 OPTIONS PER ROW */}
                <div className="grid grid-cols-3 gap-y-8 gap-x-2 sm:gap-x-6 sm:gap-y-10 pt-2 max-w-3xl mx-auto">
                  {filteredServices.map((service, index) => {
                    const Icon = service.IconComponent;
                    const isOther = service.id === 'other';

                    return (
                      <motion.button
                        key={service.id}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                        whileHover={{ y: -4, scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelectService(service)}
                        className={`group flex flex-col items-center justify-start p-2 sm:p-3 transition-all cursor-pointer text-center relative border-0 bg-transparent rounded-2xl hover:bg-neutral-100/60 ${
                          isOther ? 'text-accent-gold' : ''
                        }`}
                      >
                        {/* Custom line-art icon directly unboxed */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110">
                          <Icon size={56} className="shrink-0" />
                        </div>

                        {/* Task name only (NO AMOUNT LABELED) */}
                        <span className={`text-xs sm:text-sm font-semibold text-rich-black tracking-tight leading-snug group-hover:text-accent-gold transition-colors ${
                          isOther ? 'font-bold text-accent-gold' : ''
                        }`}>
                          {service.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: CLIENT INFORMATION (NO AMOUNT, UBER-LIKE LOCATION AUTOCOMPLETE, SCHEDULE DATE) */}
            {step === 'client-info' && selectedService && (
              <motion.div
                key="step-client-info"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4 max-w-2xl mx-auto"
              >
                {/* Header card with selected service */}
                <div className="bg-white border-2 border-accent-gold/40 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center shrink-0 border border-accent-gold/30">
                      <selectedService.IconComponent size={44} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent-gold block">
                        Selected Task
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-rich-black">
                        {selectedService.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackToSelection}
                    className="text-xs font-bold text-accent-gold hover:underline shrink-0 px-2.5 py-1 rounded-lg bg-accent-gold/10"
                  >
                    Change Task
                  </button>
                </div>

                {/* Request form: each box says what it is inside the box (no titles above) */}
                <form onSubmit={handleSubmitRequest} className="bg-white border border-warm-gray rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md space-y-3">

                  {/* "Other": name the task first */}
                  {selectedService.id === 'other' && (
                    <input
                      type="text"
                      required
                      value={customTaskTitle}
                      onChange={(e) => setCustomTaskTitle(e.target.value)}
                      placeholder="Task name (e.g. Swimming pool cleaning)"
                      aria-label="Task name"
                      className={BOX}
                    />
                  )}

                  {/* 1. Task description (or the list, for shopping and errands) */}
                  <textarea
                    rows={isNotepad ? 9 : 6}
                    required
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder={descriptionPrompt}
                    aria-label={descriptionPrompt}
                    className={isNotepad
                      ? 'w-full px-4 pt-[7px] pb-2 bg-[#FFFBEB] border border-accent-gold/40 rounded-xl text-sm text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold transition-all resize-y font-medium'
                      : `${BOX} resize-y leading-relaxed min-h-[9rem]`}
                    style={isNotepad ? {
                      lineHeight: '28px',
                      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(174,149,115,0.35) 27px, rgba(174,149,115,0.35) 28px)',
                      backgroundAttachment: 'local',
                      backgroundPosition: '0 7px',
                    } : undefined}
                  />

                  {/* 2. Name */}
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Name"
                    aria-label="Name"
                    autoComplete="name"
                    className={BOX}
                  />

                  {/* 3. Phone number */}
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Phone number"
                    aria-label="Phone number"
                    autoComplete="tel"
                    className={BOX}
                  />

                  {/* 4. Location, then 5. Apartment & house number */}
                  <LocationAutocomplete
                    compact
                    value={locationData.fullAddress}
                    onChange={(selection) => setLocationData(selection)}
                    unitOrApartment={unitOrApartment}
                    onUnitChange={(unit) => setUnitOrApartment(unit)}
                    placeholder="Location"
                  />

                  {/* 6 & 7. Date and time, side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`${BOX} !py-2 sm:!py-3 flex flex-col items-start sm:flex-row sm:items-center gap-0 sm:gap-2 cursor-pointer text-left`}>
                      <span className="text-[10px] sm:text-[inherit] text-rich-black/40 shrink-0 leading-tight">Date</span>
                      <input
                        type="date"
                        required
                        min={localIsoDate()}
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        aria-label="Date"
                        className="w-full min-w-0 bg-transparent text-rich-black focus:outline-none cursor-pointer"
                      />
                    </label>
                    <label className={`${BOX} !py-2 sm:!py-3 flex flex-col items-start sm:flex-row sm:items-center gap-0 sm:gap-2 cursor-pointer text-left`}>
                      <span className="text-[10px] sm:text-[inherit] text-rich-black/40 shrink-0 leading-tight">Time</span>
                      <select
                        value={scheduledTimeSlot}
                        onChange={(e) => setScheduledTimeSlot(e.target.value)}
                        aria-label="Time"
                        className="w-full min-w-0 bg-transparent text-rich-black focus:outline-none cursor-pointer font-medium truncate"
                      >
                        {TIME_SLOTS.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-rich-black hover:bg-black text-white text-sm font-black tracking-wide transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} className="text-accent-gold" />
                          <span>Ask Molly</span>
                          <ArrowRight size={14} className="text-accent-gold" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
