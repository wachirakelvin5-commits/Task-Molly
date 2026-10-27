import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TriangleAlert, 
  ChevronLeft, 
  MessageSquare, 
  CheckCircle2, 
  History, 
  User, 
  ExternalLink,
  Search,
  MessageCircle,
  Send,
  MoreVertical
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeviceType } from '../hooks/useDeviceType';
import { toast } from 'sonner';
import { AdminRequest, normalizeRequest } from '../lib/adminMetrics';

type ComplaintStatus = 'new' | 'in-progress' | 'completed';

function PartyCard({ label, labelClassName, uid, info }: {
  label: string;
  labelClassName: string;
  uid?: string;
  info: { name: string; tasks: number; complaintsAgainst: number };
}) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-warm-gray shadow-sm min-w-0">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest truncate ${labelClassName}`}>{label}</span>
        <User size={14} className="text-rich-black/20" />
      </div>
      {uid ? (
        <>
          <h3 className="font-bold text-base md:text-lg truncate">{info.name || 'Name not on file'}</h3>
          <p className="text-[10px] md:text-xs text-rich-black/40 truncate mb-2">ID: {uid}</p>
          <div className="flex gap-4">
            <div>
              <p className="text-[8px] md:text-[10px] text-rich-black/30 font-bold uppercase">Tasks</p>
              <p className="font-bold text-xs md:text-base">{info.tasks}</p>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-rich-black/30 font-bold uppercase">Complaints against</p>
              <p className={`font-bold text-xs md:text-base ${info.complaintsAgainst ? 'text-red-500' : ''}`}>{info.complaintsAgainst}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-rich-black/40">No one named in this complaint.</p>
      )}
    </div>
  );
}

export default function AdminComplaints() {
  const { isPhone } = useDeviceType();
  const navigate = useNavigate();
  // The admin site's notification bell opens a specific complaint by passing its id here.
  const openId = (useLocation().state as { complaintId?: string } | null)?.complaintId;
  const [activeTab, setActiveTab] = useState<ComplaintStatus>('new');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  // Every request, to show task references and each person's real task and complaint counts.
  const [requests, setRequests] = useState<AdminRequest[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    return onSnapshot(
      collection(db, 'serviceRequests'),
      (snap) => setRequests(snap.docs.map((d) => normalizeRequest(d.id, d.data()))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'serviceRequests'),
    );
  }, []);

  const requestById = new Map<string, AdminRequest>(requests.map((r: AdminRequest) => [r.id, r]));
  /** "#task_128_NRB"; a short code until the request has a number; "—" with no task. */
  const taskLabel = (taskId?: string) => {
    if (!taskId) return '—';
    const r = requestById.get(taskId);
    return r?.ref ? `#${r.ref}` : `#${taskId.slice(0, 6)}`;
  };
  const person = (uid?: string) => {
    const asClient = requests.find((r) => r.clientId === uid && r.clientName);
    const asProvider = requests.find((r) => r.providerId === uid && r.providerName);
    return {
      name: asClient?.clientName || asProvider?.providerName || '',
      tasks: uid ? requests.filter((r) => r.clientId === uid || r.providerId === uid).length : 0,
      complaintsAgainst: uid ? complaints.filter((c) => c.targetId === uid).length : 0,
    };
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'complaints'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'complaints');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedComplaint || !auth.currentUser) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, `complaints/${selectedComplaint.id}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `complaints/${selectedComplaint.id}/messages`);
    });
    return () => unsubscribe();
  }, [selectedComplaint]);

  // Open it once, as soon as it has loaded (so closing it isn't undone by later updates).
  const openedId = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || openedId.current === openId) return;
    const match = complaints.find((c) => c.id === openId);
    if (match) {
      openedId.current = openId;
      setActiveTab(match.status);
      setSelectedComplaint(match);
    }
  }, [openId, complaints]);

  const filteredComplaints = complaints.filter(c => c.status === activeTab);

  const handleSendMessage = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedComplaint) return;

    try {
      await addDoc(collection(db, `complaints/${selectedComplaint.id}/messages`), {
        text: chatMessage,
        senderId: 'admin',
        senderName: 'TaskMolly Admin',
        timestamp: serverTimestamp(),
        type: 'admin'
      });
      setChatMessage('');
      
      // Update status to in-progress if it was new
      if (selectedComplaint.status === 'new') {
        await updateDoc(doc(db, 'complaints', selectedComplaint.id), { status: 'in-progress' });
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await updateDoc(doc(db, 'complaints', id), { status: 'completed' });
      toast.success('Complaint marked as resolved');
      setSelectedComplaint(null);
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-primary-bg pt-4 md:pt-6 flex">
      {/* List Panel */}
      <div className={`w-full lg:w-96 flex-shrink-0 bg-white lg:border-r border-warm-gray min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex flex-col ${selectedComplaint ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 border-b border-warm-gray">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <button onClick={() => navigate('/admin-dashboard')} className="p-2 hover:bg-primary-bg rounded-lg transition-colors">
              <ChevronLeft size={isPhone ? 18 : 20} />
            </button>
            <h1 className="text-lg md:text-xl font-bold">Complaints</h1>
          </div>
          
          <div className="flex p-1 bg-primary-bg rounded-xl gap-1">
            {(['new', 'in-progress', 'completed'] as ComplaintStatus[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 md:py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${
                  activeTab === tab ? 'bg-white text-accent-gold shadow-sm' : 'text-rich-black/30 hover:text-rich-black'
                }`}
              >
                {tab === 'in-progress' ? 'Active' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredComplaints.length > 0 ? filteredComplaints.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              className={`w-full p-4 md:p-6 text-left border-b border-warm-gray hover:bg-primary-bg/50 transition-all group ${selectedComplaint?.id === c.id ? 'bg-accent-gold/5 border-r-4 border-r-accent-gold' : ''}`}
            >
              <div className="flex justify-between items-start mb-1.5 md:mb-2">
                <span className="text-[9px] md:text-[10px] font-bold text-rich-black/40 tracking-wide">{taskLabel(c.taskId)}</span>
                <span className="text-[9px] md:text-[10px] font-bold text-accent-gold">{c.timestamp?.toDate ? c.timestamp.toDate().toLocaleDateString() : 'Just now'}</span>
              </div>
              <h3 className="text-xs md:text-sm font-bold text-rich-black mb-1 group-hover:text-accent-gold transition-colors">{c.reason}</h3>
              <p className="text-[10px] md:text-xs text-rich-black/40 line-clamp-2 leading-relaxed">{c.comment}</p>
            </button>
          )) : (
            <div className="p-12 text-center text-rich-black/20 italic text-sm">
              No {activeTab} complaints found.
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={`flex-1 flex flex-col bg-[#F8F9FA] min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] ${!selectedComplaint ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
        {selectedComplaint ? (
          <>
            {/* Detail Header */}
            <div className="bg-white border-b border-warm-gray p-4 md:p-6 flex items-center justify-between shadow-sm sticky top-0 z-10">
              <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="lg:hidden p-2 hover:bg-primary-bg rounded-lg shrink-0"
                >
                  <ChevronLeft size={isPhone ? 18 : 20} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm md:text-lg font-bold flex items-center gap-2 truncate">
                    {selectedComplaint.reason}
                    <span className={`text-[8px] md:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 ${
                      selectedComplaint.status === 'new' ? 'bg-red-50 text-red-600' :
                      selectedComplaint.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {selectedComplaint.status}
                    </span>
                  </h2>
                  <p className="text-[10px] md:text-xs text-rich-black/40 truncate">Task: <span className="text-rich-black font-medium">{taskLabel(selectedComplaint.taskId)}</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedComplaint.status !== 'completed' && (
                  <button 
                    onClick={() => markCompleted(selectedComplaint.id)}
                    className="bg-green-600 text-white px-3 md:px-6 py-2 rounded-lg md:rounded-xl text-[9px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100 whitespace-nowrap"
                  >
                    <CheckCircle2 size={isPhone ? 14 : 16} />
                    <span className="hidden sm:inline">Mark Resolved</span>
                    <span className="sm:hidden">Resolve</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 no-scrollbar">
              {/* Party Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <PartyCard
                  label={`Reporter: ${selectedComplaint.reporterRole === 'tasker' ? 'provider' : selectedComplaint.reporterRole || 'unknown'}`}
                  labelClassName="text-accent-gold"
                  uid={selectedComplaint.reporterId}
                  info={person(selectedComplaint.reporterId)}
                />
                <PartyCard
                  label="Accused"
                  labelClassName="text-rich-black/30"
                  uid={selectedComplaint.targetId}
                  info={person(selectedComplaint.targetId)}
                />
              </div>

              {/* Original Comment */}
              <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-warm-gray italic text-[11px] md:text-sm text-rich-black/60 relative">
                <div className="absolute -top-3 left-4 md:left-8 bg-accent-gold text-white px-3 py-1 rounded-full text-[8px] md:text-[9px] font-bold tracking-widest uppercase">Initial Complaint</div>
                "{selectedComplaint.comment}"
              </div>

              {/* Chat Thread */}
              <div className="space-y-6 pt-10 border-t border-warm-gray">
                <h3 className="text-sm font-bold flex items-center gap-2 text-rich-black/40">
                  <MessageCircle size={16} />
                  Resolution Thread
                </h3>
                
                <div className="space-y-4">
                  {messages.map((m) => (
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl md:rounded-[1.5rem] shadow-sm ${
                        m.senderId === 'admin' 
                        ? 'bg-accent-gold text-white rounded-br-none' 
                        : 'bg-white border border-warm-gray text-rich-black rounded-bl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{m.text}</p>
                        <p className={`text-[9px] mt-2 font-bold opacity-40 uppercase tracking-tighter ${m.senderId === 'admin' ? 'text-white' : 'text-rich-black'}`}>
                          {m.senderName} • {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {messages.length === 0 && (
                    <div className="bg-primary-bg p-8 rounded-[2rem] text-center text-rich-black/20 text-xs italic">
                      Start a chat with the user to begin investigation.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white border-t border-warm-gray shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Resolve complaint..."
                  className="flex-1 bg-primary-bg border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-accent-gold/20 outline-none font-medium"
                />
                <button 
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="w-14 h-14 bg-accent-gold text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-accent-gold/20 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center p-20 opacity-20">
            <MessageSquare size={80} className="mx-auto mb-6" />
            <p className="text-xl font-bold tracking-tight">Select a complaint to verify logs</p>
          </div>
        )}
      </div>
    </div>
  );
}
