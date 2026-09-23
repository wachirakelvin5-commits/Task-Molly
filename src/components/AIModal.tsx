import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, Sparkles } from 'lucide-react';
import { askMollyStream } from '../services/geminiService';
import { checkProviderAvailability, formatWaitTime } from '../services/availabilityService';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
}

interface AIModalProps {
  onClose: () => void;
}

export default function AIModal({ onClose }: AIModalProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Ask Molly. Let's get you paired up with a pro." }
  ]);
  const [loading, setLoading] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<string | null>(null);
  const [detectedService, setDetectedService] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingConfirmation]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleConfirmTask = async () => {
    if (!pendingConfirmation) return;
    
    setLoading(true);
    const requestData = {
      ...pendingConfirmation,
      timestamp: new Date().toISOString(),
      syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const currentUser = auth.currentUser;

    try {
      if (!currentUser) {
        console.log("[AIModal Sync Log] No user found. Storing pending request and redirecting to login:", requestData.syncId);
        sessionStorage.setItem('pending_service_request', JSON.stringify(requestData));
        toast.success("Charge accepted! Log in to finalize your request.");
        setTimeout(() => {
          navigate('/auth?redirect=pending-task');
          onClose();
        }, 1500);
        return;
      }

      console.log("[AIModal Sync Log] User logged in. Direct creation attempt...");
      const res = await fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentUser.uid,
          clientName: currentUser.displayName || 'Client',
          ...requestData
        })
      });

      if (res.ok) {
        const resData = await res.json();
        console.log("[AIModal Sync Log] Direct creation success! ID:", resData.id);
        toast.success("Task created! Redirecting to your dashboard...");
        setTimeout(() => {
          navigate('/dashboard');
          onClose();
        }, 2000);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("[AIModal Sync Log] Direct creation failed:", errData);
        toast.error(errData.message || "Failed to create task. Please try again.");
      }
    } catch (err) {
      console.error("[AIModal Sync Log] Exception during direct creation:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setPendingConfirmation(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || pendingConfirmation) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await askMollyStream(
        userMsg, 
        history, 
        availabilityInfo || undefined,
        (partial) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'model' && last.isStreaming) {
              return [...prev.slice(0, -1), { role: 'model', text: partial, isStreaming: true }];
            }
            return [...prev, { role: 'model', text: partial, isStreaming: true }];
          });
        }
      );

      console.log("Molly Stream Finished:", response);
      
      const aiMessage = response.message || "I've processed your request.";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model' && last.isStreaming) {
          return [...prev.slice(0, -1), { role: 'model', text: aiMessage }];
        }
        return [...prev, { role: 'model', text: aiMessage }];
      });

      // Following logic remains the same (service detection, unlisted, etc.)
      const newService = response.serviceDetails?.serviceType;
      // ... (rest of the logic for service integration)
      if (newService && newService !== detectedService && !response.serviceDetails?.isUnlisted) {
        setDetectedService(newService);
        const status = await checkProviderAvailability(newService);
        if (!status.available && status.nextAvailableInMinutes) {
          const waitStr = formatWaitTime(status.nextAvailableInMinutes);
          setAvailabilityInfo(`${newService} is currently busy. Next available in ${waitStr}.`);
        } else {
          setAvailabilityInfo(`${newService} has available pros.`);
        }
      }

      const isUnlisted = response.serviceDetails?.isUnlisted === true || 
                        aiMessage.toLowerCase().includes("don't currently have this listed") ||
                        aiMessage.toLowerCase().includes("activate this service for you");

      if (isUnlisted) {
        const serviceType = response.serviceDetails?.serviceType || (userMsg.length < 30 ? userMsg : "Unlisted Service");
        const currentUser = auth.currentUser;
        await fetch('/api/unlisted-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: currentUser?.uid || 'anonymous',
            email: currentUser?.email || 'anonymous',
            serviceType: serviceType,
            rawMessage: userMsg,
            timestamp: new Date().toISOString()
          })
        });
        toast.success("Request received! We'll look into this service.");
        return;
      }

      if (response.serviceDetails?.isComplete) {
        setPendingConfirmation({
          serviceType: response.serviceDetails.serviceType,
          description: response.serviceDetails.description || response.message,
          urgency: response.serviceDetails.urgency,
          location: response.serviceDetails.location,
          deadline: response.serviceDetails.deadline,
          initialQuote: response.serviceDetails.initialQuote,
          budget: response.serviceDetails.budget 
        });
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having a bit of trouble connecting. Could you try again?" }]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24 sm:pt-28 md:pt-32 bg-rich-black/40 backdrop-blur-xl overflow-y-auto no-scrollbar"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-primary-bg w-full max-w-4xl h-[80dvh] sm:h-[75dvh] rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col border border-warm-gray"
      >
        {/* Header */}
        <div className="p-6 border-b border-warm-gray flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rich-black text-accent-gold rounded-full flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-medium text-lg">Ask Molly</h2>
              <p className="text-xs text-rich-black/40 uppercase tracking-wider">AI Concierge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-warm-gray rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          {messages.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] p-4 sm:p-5 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-accent-gold text-white rounded-tr-none' 
                  : 'bg-white border border-warm-gray rounded-tl-none'
              }`}>
                <p className="text-sm sm:text-base md:text-lg leading-relaxed">{m.text}</p>
              </div>
            </motion.div>
          ))}
          {pendingConfirmation && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border-2 border-accent-gold p-6 rounded-3xl rounded-tl-none shadow-xl max-w-[90%] sm:max-w-md">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-accent-gold text-white rounded-full flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-bold text-rich-black">Service Proposal</h3>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-1">Service</p>
                      <p className="text-sm font-semibold text-rich-black">{pendingConfirmation.serviceType}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-1">Timeline</p>
                      <p className="text-sm font-semibold text-rich-black">{pendingConfirmation.deadline || 'Flexible'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-1">Estimated Charge</p>
                    <p className="text-2xl font-light text-accent-gold">KES {pendingConfirmation.budget || pendingConfirmation.initialQuote}</p>
                  </div>
                  <div className="p-3 bg-primary-bg rounded-xl">
                    <p className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold mb-1">Task Summary</p>
                    <p className="text-xs text-rich-black/60 italic leading-relaxed line-clamp-3">
                      {pendingConfirmation.description}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleConfirmTask}
                    className="flex-1 py-3 bg-rich-black text-accent-gold rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Agree & Proceed
                  </button>
                  <button 
                    onClick={() => setPendingConfirmation(null)}
                    className="px-6 py-3 border border-warm-gray rounded-full text-xs font-bold text-rich-black/40 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-warm-gray p-4 sm:p-5 rounded-2xl rounded-tl-none flex gap-2">
                <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-white border-t border-warm-gray">
          <div className="relative flex items-center">
            <input 
              ref={inputRef}
              autoFocus
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Tell Molly what you need..."
              className="w-full bg-primary-bg border border-warm-gray rounded-full px-6 py-4 pr-16 focus:outline-none focus:border-accent-gold transition-all placeholder:text-rich-black/20"
            />
            
            {/* Slow Blinking Cursor Indicator */}
            {!input && (
              <div className="absolute left-6 flex items-center pointer-events-none">
                <div className="w-[2px] h-5 bg-accent-gold animate-slow-blink rounded-full" />
              </div>
            )}

            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 p-3 bg-rich-black text-accent-gold rounded-full hover:scale-105 transition-transform disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
