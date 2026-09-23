import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion } from 'motion/react';
import { Send, X, CheckCircle, Trash2 } from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';

interface ChatPageProps {
  user: UserProfile;
}

export default function ChatPage({ user }: ChatPageProps) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.emit('join-room', jobId);

    newSocket.on('receive-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [jobId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim() || !socket) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      jobId: jobId!,
      senderId: user.uid,
      text: input,
      timestamp: new Date().toISOString()
    };

    socket.emit('send-message', {
      roomId: jobId,
      ...newMessage
    });

    setInput('');
  };

  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelRequest = async () => {
    if (!jobId || !window.confirm("Are you sure you want to cancel this service request?")) return;
    
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/cancel-service-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: jobId, clientId: user.uid })
      });
      
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to cancel request");
        setIsCancelling(false);
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert("An error occurred");
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pt-24 pb-10 px-6 max-w-5xl mx-auto flex flex-col h-[100dvh]">
      {/* Thread Header */}
      <div className="bg-white border border-warm-gray p-6 rounded-3xl flex items-center justify-between mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-bg rounded-full flex items-center justify-center border border-warm-gray">
            <span className="text-accent-gold font-bold">P</span>
          </div>
          <div>
            <h2 className="font-medium">Chat with Pro</h2>
            <p className="text-xs text-rich-black/40 uppercase tracking-widest">Job ID: {jobId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={isCancelling}
            onClick={handleCancelRequest}
            className={`flex items-center gap-2 px-4 py-2 border border-warm-gray rounded-full text-sm hover:bg-red-50 hover:text-red-600 transition-colors ${isCancelling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCancelling ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : <Trash2 size={16} />}
            <span>{isCancelling ? 'Cancelling...' : 'Cancel Request'}</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-rich-black text-white rounded-full text-sm hover:bg-rich-black/90 transition-colors">
            <CheckCircle size={16} />
            <span>Hire Pro</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-4 rounded-2xl ${
              m.senderId === user.uid 
                ? 'bg-accent-gold text-white rounded-tr-none' 
                : 'bg-white border border-warm-gray rounded-tl-none'
            }`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
              <span className="text-[10px] opacity-60 mt-2 block text-right">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-20 text-rich-black/40 italic">
            Start the conversation to discuss details, tools, and pricing.
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border border-warm-gray p-4 rounded-3xl shadow-sm">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="w-full bg-primary-bg border border-warm-gray rounded-full px-6 py-4 pr-16 focus:outline-none focus:border-accent-gold transition-all"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="absolute right-2 p-3 bg-rich-black text-accent-gold rounded-full hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
