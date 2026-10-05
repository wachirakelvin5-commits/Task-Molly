import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    refCode: string;
    service: string;
    providerName: string;
    location: string;
    date?: string;
    time?: string;
    scheduledTime?: string;
  } | null;
  onConfirmSchedule: (taskId: string, scheduledString: string) => void;
}

export default function ScheduleTimeModal({ isOpen, onClose, task, onConfirmSchedule }: ScheduleTimeModalProps) {
  const [selectedDate, setSelectedDate] = useState('4th October, Sunday');
  const [selectedSlot, setSelectedSlot] = useState('4pm');
  const [customTime, setCustomTime] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);

  if (!isOpen || !task) return null;

  const dateOptions = [
    { label: 'Sunday', subtext: 'Oct 04', fullDate: '4th October, Sunday' },
    { label: 'Monday', subtext: 'Oct 05', fullDate: '5th October, Monday' },
    { label: 'Tuesday', subtext: 'Oct 06', fullDate: '6th October, Tuesday' },
    { label: 'Wednesday', subtext: 'Oct 07', fullDate: '7th October, Wednesday' },
    { label: 'Thursday', subtext: 'Oct 08', fullDate: '8th October, Thursday' },
    { label: 'Friday', subtext: 'Oct 09', fullDate: '9th October, Friday' },
  ];

  const timeSlots = [
    { time: '4pm', label: 'Late Afternoon' },
    { time: '9am', label: 'Morning Slot' },
    { time: '11am', label: 'Mid-Morning' },
    { time: '1pm', label: 'Early Afternoon' },
    { time: '2:30pm', label: 'Afternoon' },
    { time: '5:30pm', label: 'Evening Slot' }
  ];

  const formatCustomTime = (rawTime: string) => {
    if (!rawTime) return '4pm';
    const match = rawTime.match(/(\d+):(\d+)/);
    if (!match) return rawTime;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return minutes === 0 ? `${hours}${ampm}` : `${hours}:${minutes < 10 ? '0' + minutes : minutes}${ampm}`;
  };

  const handleSave = () => {
    const finalTime = useCustomTime && customTime ? formatCustomTime(customTime) : selectedSlot;
    const scheduledString = `${selectedDate} ${finalTime}`;
    onConfirmSchedule(task.id, scheduledString);
    toast.success(`Service scheduled for ${scheduledString}!`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-warm-gray/60"
        >
          {/* Header */}
          <div className="p-4 bg-rich-black text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-gold/20 text-accent-gold flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Schedule Service Time</h3>
                <p className="text-[10px] text-accent-gold font-mono">{task.refCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Task Snapshot */}
            <div className="bg-primary-bg p-3.5 rounded-2xl border border-warm-gray/60 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-accent-gold">
                {task.service}
              </span>
              <p className="text-xs font-bold text-rich-black">
                Pro: <span className="font-normal text-rich-black/70">{task.providerName}</span>
              </p>
              <p className="text-[10px] text-rich-black/50 flex items-center gap-1">
                <MapPin size={11} className="text-accent-gold" />
                <span>{task.location}</span>
              </p>
            </div>

            {/* Select Date */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-rich-black block mb-2">
                1. Select Preferred Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                {dateOptions.map((d) => {
                  const isSelected = selectedDate === d.fullDate;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setSelectedDate(d.fullDate)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-rich-black text-white border-rich-black shadow-xs'
                          : 'bg-white hover:bg-neutral-50 text-rich-black border-warm-gray'
                      }`}
                    >
                      <span className="text-xs font-bold">{d.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-accent-gold' : 'text-rich-black/50'}`}>
                        {d.subtext}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Time Slot */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-rich-black">
                  2. Select Time Window
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className="text-[10px] font-bold text-accent-gold hover:underline cursor-pointer"
                >
                  {useCustomTime ? 'Use Presets' : 'Custom Time'}
                </button>
              </div>

              {!useCustomTime ? (
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-accent-gold text-rich-black border-accent-gold font-bold shadow-xs'
                            : 'bg-white hover:bg-neutral-50 text-rich-black border-warm-gray font-medium'
                        }`}
                      >
                        <div>
                          <p className="text-xs">{slot.time}</p>
                          <p className={`text-[9px] ${isSelected ? 'text-rich-black/70' : 'text-rich-black/40'}`}>
                            {slot.label}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 size={14} className="text-rich-black" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-primary-bg rounded-xl border border-warm-gray">
                    <Clock size={16} className="text-accent-gold" />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="bg-transparent text-sm font-bold text-rich-black focus:outline-none flex-1"
                    />
                  </div>
                  <p className="text-[10px] text-rich-black/50">Enter the exact time you want the pro to arrive.</p>
                </div>
              )}
            </div>

            {/* Notice */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-accent-gold/30 text-rich-black">
              <Sparkles size={14} className="text-accent-gold shrink-0" />
              <p className="text-[11px] leading-tight text-rich-black/80">
                Your pro will receive an instant push alert and synchronize their arrival schedule.
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-primary-bg border-t border-warm-gray/60 flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rich-black/60 hover:text-rich-black rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-rich-black hover:bg-black text-accent-gold rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Confirm Scheduled Time
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
