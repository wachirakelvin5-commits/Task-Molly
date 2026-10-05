import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Star, 
  Calendar,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'client' | 'pro';
  text: string;
  time: string;
}

interface ChatWithProModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    refCode: string;
    service: string;
    providerName: string;
    providerRole: string;
    providerPhoto: string;
    providerRating: number;
    scheduledTime?: string;
    date?: string;
    time?: string;
  } | null;
  clientName?: string;
}

export default function ChatWithProModal({ isOpen, onClose, task, clientName = 'Kelvin' }: ChatWithProModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task) return;

    const storageKey = `task_chat_${task.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    // Default conversation starter tailored to the specific pro and service
    const initialThread: Message[] = [
      {
        id: 'msg-init-1',
        sender: 'pro',
        text: `Habari ${clientName}! I am assigned to your service request for "${task.service}" (Ref: ${task.refCode}).`,
        time: 'Just now'
      },
      {
        id: 'msg-init-2',
        sender: 'pro',
        text: `I will arrive on schedule. Please let me know if you have specific gate directions or any special instructions!`,
        time: 'Just now'
      }
    ];

    setMessages(initialThread);
    localStorage.setItem(storageKey, JSON.stringify(initialThread));
  }, [task?.id, clientName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !task) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'client',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`task_chat_${task.id}`, JSON.stringify(updated));
    setInputText('');

    // Simulate realistic automated Pro reply after brief delay
    setTimeout(() => {
      const autoReplies = [
        "Sawa sawa! Noted. See you shortly.",
        "Thank you! I have all required tools ready and will be there right on time.",
        "Perfect, thank you for confirming!",
        "Understood. I will call you upon arrival at the gate."
      ];
      const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];

      const proReply: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'pro',
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => {
        const withPro = [...prev, proReply];
        localStorage.setItem(`task_chat_${task.id}`, JSON.stringify(withPro));
        return withPro;
      });
    }, 1200);
  };

  if (!isOpen || !task) return null;

  const quickChips = [
    "I am at home 👍",
    "Call when you arrive at gate 📞",
    "Confirmed on schedule ⏰",
    "Where are you currently? 📍"
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-warm-gray/60 h-[85vh] max-h-[640px]"
        >
          {/* Header */}
          <div className="p-4 bg-rich-black text-white flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <img
                  src={task.providerPhoto}
                  alt={task.providerName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-accent-gold"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-rich-black animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold truncate text-white">{task.providerName}</h3>
                  <CheckCircle2 size={13} className="text-accent-gold fill-accent-gold text-rich-black shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  <span className="truncate">{task.providerRole}</span>
                  <span>•</span>
                  <div className="flex items-center gap-0.5 text-accent-gold font-bold">
                    <Star size={10} fill="currentColor" />
                    <span>{task.providerRating}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="tel:+254700000000"
                onClick={() => toast.info(`Calling ${task.providerName}...`)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Call Pro"
              >
                <Phone size={15} />
              </a>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Context Banner: Service & Scheduled Time */}
          <div className="bg-primary-bg px-4 py-2.5 border-b border-warm-gray/60 flex items-center justify-between text-xs shrink-0">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-accent-gold block truncate">
                {task.refCode} • {task.service}
              </span>
              <p className="text-[11px] font-bold text-rich-black flex items-center gap-1.5 truncate mt-0.5">
                <Clock size={12} className="text-accent-gold shrink-0" />
                <span>{task.scheduledTime || `${task.date || 'Today'} at ${task.time || '10:00 AM'}`}</span>
              </p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              Active Chat
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fcfbfa] no-scrollbar">
            {messages.map((m) => {
              const isClient = m.sender === 'client';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isClient
                        ? 'bg-rich-black text-white rounded-tr-xs shadow-xs'
                        : 'bg-white text-rich-black border border-warm-gray rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="break-words">{m.text}</p>
                  </div>
                  <span className="text-[9px] text-rich-black/40 mt-1 px-1">
                    {m.time}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="px-3 pt-2 pb-1 bg-white border-t border-warm-gray/40 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip)}
                className="px-2.5 py-1 bg-primary-bg hover:bg-accent-gold/15 hover:border-accent-gold text-rich-black/75 hover:text-rich-black text-[10px] font-medium rounded-full border border-warm-gray whitespace-nowrap transition-all shrink-0 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-warm-gray/40 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder={`Message ${task.providerName.split(' ')[0]}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-primary-bg border border-warm-gray focus:border-accent-gold rounded-xl px-3.5 py-2.5 text-xs text-rich-black focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-xl bg-rich-black hover:bg-black text-accent-gold flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
              <Send size={15} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
