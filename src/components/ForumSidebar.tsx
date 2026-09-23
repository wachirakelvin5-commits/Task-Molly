import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Hash, TrendingUp, MessageCircle, ChevronDown, ChevronUp, Plus, Sparkles, LogIn, Smile } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import EmojiCreatorModal from './EmojiCreatorModal';

interface ForumMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: any;
  topic?: string;
}

interface TopicStats {
  name: string;
  count: number;
  rank: number;
}

const TOPICS = ['Flooding & Drainage', 'General', 'Cleaning', 'Plumbing', 'Electrical', 'Gardening'];

const WHATSAPP_EMOJIS = [
  '😊', '🤩', '🥳', '😎', '🥰', '🤔', '😤', '😴', '😲', '👍',
  '🙌', '👏', '🔥', '✨', '💯', '❤️', '📍', '🏠', '🛠️', '💧',
  '😂', '🤣', '😍', '😭', '🙏', '🥺', '🎉', '💔', '🤡', '💀',
  '🙄', '🤤', '🥵', '🥶', '🤢', '🤠', '🤝', '💪', '👀', '💡',
  '🌈', '⚡', '💣', '🚀', '🛒', '💰', '🔑', '🔓', '📣', '🔔',
  '✅', '❌', '⚠️', '🚨', '📢', '💭', '💬', '🔝', '🔜', '🆕',
  '👋', '🤘', '🤟', '✌️', '🤞', '🤙', '🖐️', '✋', '🖖',
  '🌍', '🪐', '🌟', '🌙', '☀️', '⛅', '⛈️', '🍄', '🌳', '🌴'
];

const KENYAN_NAMES = ['Simba', 'Twiga', 'Kifaru', 'Swara', 'Chui', 'Nyati', 'Mango', 'Ndizi', 'Nanasi', 'Mapera', 'Tembo', 'Kanga', 'Kware', 'Mbuni', 'Punda'];

function getGuestName() {
  let deviceId = localStorage.getItem('taskmolly_device_id');
  if (!deviceId) {
    deviceId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('taskmolly_device_id', deviceId);
  }
  const seed = parseInt(deviceId);
  const name1 = KENYAN_NAMES[seed % KENYAN_NAMES.length];
  const name2 = KENYAN_NAMES[(seed * 7) % KENYAN_NAMES.length];
  return `Guest${name1}${name2}${deviceId.slice(-2)}`;
}

const DUMMY_COMMENTS: Partial<ForumMessage>[] = [
  { userName: 'ArchiBuilder', content: 'We need to implement porous concrete for all new driveways.', topic: 'Flooding & Drainage' },
  { userName: 'TownPlanner', content: 'Our current drainage system is 40 years old, time for an upgrade!', topic: 'Flooding & Drainage' },
  { userName: 'EcoWarrior', content: 'Rainwater harvesting could reduce the load on the sewers significantly.', topic: 'Flooding & Drainage' },
  { userName: 'HomeSafety', content: 'Check your sumps guys! Don\'t wait for the rain start.', topic: 'Flooding & Drainage' },
  { userName: 'DrainMaster', content: 'I specialize in french drains, they are a game changer for garden flooding.', topic: 'Flooding & Drainage' },
  { userName: 'CityEngineer', content: 'The new culvert design in Upper Nairobi is working well today despite the drizzle.', topic: 'Flooding & Drainage' },
  { userName: 'ConcernedCit', content: 'Anyone else seeing the blockages on Ring Road? Maintenance needs to get on that.', topic: 'Flooding & Drainage' },
  { userName: 'GreenRoofDev', content: 'We are testing green roofs on the new tech hub to absorb runoff. Results look promising.', topic: 'Flooding & Drainage' },
  { userName: 'PlumbExpert', content: 'Make sure your non-return valves are clear, or you might get reverse flow from the main line.', topic: 'Flooding & Drainage' },
  { userName: 'WeatherWatch', content: 'Heavier rains predicted tomorrow. Clear your gutters tonight!', topic: 'Flooding & Drainage' },
];

export default function ForumSidebar() {
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [guestName, setGuestName] = useState('');
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stable device-based guest name
    setGuestName(getGuestName());

    const q = query(
      collection(db, 'forum'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ForumMessage[];

      // If no messages in the "Flooding & Drainage" topic, seed some local ones for display
      const floodingMsgs = msgs.filter(m => m.topic === 'Flooding & Drainage');
      if (floodingMsgs.length < 3) {
        const fakeMsgs = DUMMY_COMMENTS.map((c, i) => ({
          id: `seed-${i}`,
          userId: `seed-${i}`,
          userName: c.userName!,
          content: c.content!,
          topic: c.topic!,
          timestamp: new Date()
        })) as ForumMessage[];
        msgs = [...msgs, ...fakeMsgs];
      }

      setMessages(msgs);

      // Simple count of comments per topic
      const stats = TOPICS.map(name => ({
        name,
        count: msgs.filter(m => m.topic === name).length,
        rank: 0
      })).sort((a, b) => b.count - a.count);
      
      const rankedStatsFixed = stats.map((s, i) => ({ ...s, rank: i + 1 }));
      setTopicStats(rankedStatsFixed);

      // Add a simulated mention for testing if none exists
      const hasMention = msgs.some(m => m.content.includes(`@${guestName}`));
      if (!hasMention && msgs.length > 0) {
        const testMention: ForumMessage = {
          id: 'test-mention',
          userId: 'system',
          userName: 'TaskMollyBot',
          content: `Welcome to the community @${guestName}! 🤝 Hope you find what you need.`,
          topic: rankedStatsFixed[0]?.name || 'General',
          timestamp: new Date()
        };
        setMessages(prev => [testMention, ...prev]);
      }

      // Auto-expand the top topic if nothing expanded
      if (Object.keys(expandedTopics).length === 0 && rankedStatsFixed.length > 0) {
        setExpandedTopics({ [rankedStatsFixed[0].name]: true });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'forum');
    });

    return () => unsubscribe();
  }, [guestName]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !showCommentModal) return;

    const user = auth.currentUser;
    const finalUserName = user?.displayName || guestName || 'Anonymous Guest';
    const finalUserId = user?.uid || `guest-${guestName}`;

    // Detect mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      mentions.push(match[1]);
    }

    try {
      await addDoc(collection(db, 'forum'), {
        userId: finalUserId,
        userName: finalUserName,
        userAvatar: user?.photoURL || '',
        content: newMessage,
        topic: showCommentModal,
        mentions: mentions,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
      setShowCommentModal(null);
      setShowEmojiPicker(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forum');
    }
  };

  const handleRoleRedirect = () => {
    const currentPath = window.location.pathname;
    navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
    setShowCommentModal(null);
  };

  const toggleTopic = (topicName: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicName]: !prev[topicName]
    }));
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => `${prev}${emoji} `);
  };

  const renderContent = (content: string, isMentioned: boolean) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className={`font-bold px-1 rounded ${isMentioned ? 'bg-accent-gold text-white' : 'text-accent-gold'}`}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (topicStats.length === 0) return null;

  const mainTopic = topicStats[0];
  const subTopics = topicStats.slice(1);

  return (
    <div className="flex flex-col h-full bg-primary-bg border-r border-warm-gray">
      {/* Header - Shrunk Height */}
      <div className="h-10 border-b border-warm-gray bg-white/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent-gold/20 flex items-center justify-center text-accent-gold">
            <TrendingUp size={10} />
          </div>
          <h2 className="text-[9px] font-bold text-rich-black uppercase tracking-[0.4em]">Community Feed</h2>
        </div>
        <button 
          onClick={() => setIsEmojiModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-gold/10 hover:bg-accent-gold/20 transition-all group"
        >
          <Sparkles size={10} className="text-accent-gold group-hover:scale-125 transition-transform" />
          <span className="text-[8px] font-bold text-accent-gold uppercase tracking-widest">Emoji Lab</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Main interactive topic #1 - Now retractable and scrolling */}
        <div className="border border-accent-gold/20 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className={`p-3 flex items-center justify-between transition-colors ${expandedTopics[mainTopic.name] ? 'bg-accent-gold/5' : 'hover:bg-primary-bg'}`}>
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTopic(mainTopic.name)}>
              <span className="text-[10px] text-accent-gold font-mono font-bold">#1</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-rich-black leading-tight">{mainTopic.name}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowCommentModal(mainTopic.name)}
                className="w-5 h-5 rounded flex items-center justify-center border border-warm-gray text-rich-black/40 hover:text-accent-gold hover:border-accent-gold/50 transition-all text-xs"
              >
                +
              </button>
              {expandedTopics[mainTopic.name] ? 
                <ChevronUp size={12} className="text-rich-black/20 cursor-pointer" onClick={() => toggleTopic(mainTopic.name)} /> : 
                <ChevronDown size={12} className="text-rich-black/20 cursor-pointer" onClick={() => toggleTopic(mainTopic.name)} />
              }
            </div>
          </div>
          
          <AnimatePresence initial={false}>
            {expandedTopics[mainTopic.name] && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 260 }}
                exit={{ height: 0 }}
                className="overflow-hidden bg-white/50"
              >
                <div className="p-4 h-full relative border-t border-warm-gray/30">
                  <div className="mask-fade-up h-full overflow-hidden">
                    <motion.div
                      animate={{ y: ["0%", "-50%"] }}
                      transition={{ 
                        duration: Math.max(10, messages.filter(m => m.topic === mainTopic.name).length * 8), 
                        ease: "linear", 
                        repeat: Infinity 
                      }}
                      className="space-y-4 pb-4"
                    >
                      {[...messages.filter(m => m.topic === mainTopic.name), ...messages.filter(m => m.topic === mainTopic.name)].map((msg, i) => {
                        const isMentioned = msg.content.includes(`@${guestName}`) || (auth.currentUser?.displayName && msg.content.includes(`@${auth.currentUser.displayName}`));
                        return (
                          <motion.div 
                            key={`${msg.id}-${i}`} 
                            animate={isMentioned ? {
                              x: [0, -2, 2, -2, 2, 0],
                            } : {}}
                            transition={{
                              duration: 0.4,
                              repeat: isMentioned ? Infinity : 0,
                              repeatDelay: 3
                            }}
                            className="flex items-start gap-3"
                          >
                            <div className="w-6 h-6 rounded-lg bg-warm-gray/20 flex-shrink-0 flex items-center justify-center text-[10px] text-rich-black/20 font-bold">
                              {msg.userName.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-[10px] font-bold text-accent-gold">{msg.userName}</span>
                              </div>
                              <p className={`text-[11px] leading-relaxed p-2 rounded-xl rounded-tl-none border ${
                                isMentioned 
                                ? 'bg-accent-gold/10 border-accent-gold/30 text-rich-black' 
                                : 'bg-primary-bg/40 border-warm-gray/30 text-rich-black/70'
                              }`}>
                                {renderContent(msg.content, !!isMentioned)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subsequent topics */}
        <div className="space-y-3">
          <div className="text-[8px] text-rich-black/20 uppercase tracking-[0.2em] px-2">Rising Intelligence</div>
          {subTopics.map((topic) => (
            <div key={topic.name} className="border border-warm-gray rounded-lg overflow-hidden bg-white">
              <div className={`p-3 flex items-center justify-between transition-colors ${expandedTopics[topic.name] ? 'bg-primary-bg' : 'hover:bg-primary-bg/50'}`}>
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTopic(topic.name)}>
                  <span className="text-[10px] font-mono text-rich-black/10">#{topic.rank}</span>
                  <span className="text-[11px] font-medium text-rich-black/60 uppercase tracking-tighter">{topic.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-rich-black/20">{topic.count}</span>
                  {expandedTopics[topic.name] ? 
                    <ChevronUp size={12} className="text-rich-black/20 cursor-pointer" onClick={() => toggleTopic(topic.name)} /> : 
                    <ChevronDown size={12} className="text-rich-black/20 cursor-pointer" onClick={() => toggleTopic(topic.name)} />
                  }
                </div>
              </div>
              
              <AnimatePresence initial={false}>
                {expandedTopics[topic.name] && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 180 }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="h-full flex flex-col pt-0 bg-primary-bg/10 border-t border-warm-gray/30">
                      <div className="flex-1 overflow-hidden p-3 pt-4">
                        <div className="mask-fade-up h-full overflow-hidden">
                          <motion.div
                            animate={{ y: ["0%", "-50%"] }}
                            transition={{ 
                              duration: Math.max(8, messages.filter(m => m.topic === topic.name).length * 10), 
                              ease: "linear", 
                              repeat: Infinity 
                            }}
                            className="space-y-3 pb-3"
                          >
                            {[...messages.filter(m => m.topic === topic.name), ...messages.filter(m => m.topic === topic.name)].map((msg, i) => {
                              const isMentioned = msg.content.includes(`@${guestName}`) || (auth.currentUser?.displayName && msg.content.includes(`@${auth.currentUser.displayName}`));
                              return (
                                <motion.div 
                                  key={`${msg.id}-${i}`} 
                                  animate={isMentioned ? { x: [-1, 1, -1, 1, 0] } : {}}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-4 h-4 rounded bg-accent-gold/10 flex-shrink-0 flex items-center justify-center text-[8px] text-accent-gold font-bold">
                                    {msg.userName.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-[10px] leading-snug ${isMentioned ? 'font-bold' : ''}`}>
                                      <span className="font-bold text-accent-gold/40 mr-1">{msg.userName}</span>
                                      {renderContent(msg.content, !!isMentioned)}
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </div>
                      </div>
                      <div className="p-3 bg-white/50 border-t border-warm-gray/20">
                        <button 
                          onClick={() => setShowCommentModal(topic.name)}
                          className="w-full py-2 rounded-lg bg-accent-gold text-[9px] text-white font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Contribute
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <EmojiCreatorModal 
        isOpen={isEmojiModalOpen} 
        onClose={() => setIsEmojiModalOpen(false)} 
      />

      {/* Comment Modal Pop-up */}
      <AnimatePresence>
        {showCommentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-warm-gray p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-accent-gold" />
              
              <h3 className="text-sm font-bold text-rich-black uppercase tracking-widest mb-1">New Message</h3>
              <p className="text-[9px] text-accent-gold mb-4 uppercase tracking-widest">Post to #{showCommentModal}</p>
              
              <div className="mb-6 flex items-center justify-between p-3 bg-primary-bg rounded-xl border border-warm-gray/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold">
                    <User size={12} />
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest text-rich-black/30 font-bold">Posting As</span>
                    <span className="block text-[10px] font-bold text-rich-black">{auth.currentUser?.displayName || guestName}</span>
                  </div>
                </div>
                {!auth.currentUser && (
                  <button 
                    onClick={handleRoleRedirect}
                    className="flex items-center gap-1.5 text-[8px] font-bold text-accent-gold uppercase tracking-widest hover:underline"
                  >
                    <LogIn size={10} />
                    Customize Profile
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSend} className="space-y-4">
                <div className="relative">
                  <textarea
                    autoFocus
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Enter message text... (use @name to tag)"
                    className="w-full bg-primary-bg border border-warm-gray rounded-xl p-4 text-xs text-rich-black placeholder:text-rich-black/20 focus:outline-none focus:border-accent-gold/50 transition-all min-h-[120px]"
                  />
                  
                  {/* Emoji Picker Button */}
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 rounded-lg transition-all ${showEmojiPicker ? 'bg-accent-gold text-white' : 'bg-white hover:bg-warm-gray/10 text-accent-gold'}`}
                    >
                      <Smile size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline Emoji Selector */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-primary-bg border border-warm-gray rounded-xl p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[8px] uppercase font-bold tracking-widest text-rich-black/40">Emoji Palette Selector</span>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 no-scrollbar">
                        {WHATSAPP_EMOJIS.map(e => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => addEmoji(e)}
                            className="aspect-square flex items-center justify-center bg-white border border-warm-gray/50 rounded-lg text-lg hover:scale-110 active:scale-95 transition-all"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCommentModal(null)}
                    className="flex-1 py-3 text-[10px] text-rich-black/40 uppercase font-bold tracking-widest hover:text-rich-black transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="flex-1 py-3 bg-accent-gold text-white text-[10px] uppercase font-bold tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent-gold/20"
                  >
                    Broadcast
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

