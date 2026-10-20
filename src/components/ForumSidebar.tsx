import { useState, useEffect, useRef } from 'react';
import { Heart, CornerDownRight, X, Send } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

interface ForumMessage {
  id: string;
  userId: string;
  userName: string;
  naverId?: string;
  userAvatar?: string;
  content: string;
  timestamp: any;
  topic?: string;
  likes?: number;
  replyToId?: string;
  replyToUser?: string;
}

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

// Generates a unique Naver ID every time someone shares a comment
export function generateNaverId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)];
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `NAVER-${prefix}${digits}`;
}

const DUMMY_COMMENTS: Partial<ForumMessage>[] = [
  { id: 'seed-0', userName: 'ArchiBuilder', naverId: 'NAVER-A48291', content: 'We need to implement porous concrete for all new driveways to combat urban runoff.', topic: 'Share Your Thoughts', likes: 18 },
  { id: 'seed-1', userName: 'TownPlanner', naverId: 'NAVER-T71924', content: 'Our current neighborhood drainage system is 40 years old, time for an upgrade!', topic: 'Share Your Thoughts', likes: 25 },
  { id: 'seed-2', userName: 'EcoWarrior', naverId: 'NAVER-E39201', content: 'Rainwater harvesting could reduce the load on the municipal sewers significantly.', topic: 'Share Your Thoughts', likes: 14 },
  { id: 'seed-3', userName: 'HomeSafety', naverId: 'NAVER-H84920', content: 'Check your sumps and roof gutters guys! Don\'t wait for the rain to start.', topic: 'Share Your Thoughts', likes: 29 },
  { id: 'seed-4', userName: 'DrainMaster', naverId: 'NAVER-D62019', content: 'I specialize in french drains, they are a complete game changer for residential compounds.', topic: 'Share Your Thoughts', likes: 32 },
  { id: 'seed-5', userName: 'CityEngineer', naverId: 'NAVER-C51029', content: 'The new culvert design in Upper Nairobi is holding up really well today.', topic: 'Share Your Thoughts', likes: 11 },
  { id: 'seed-6', userName: 'ConcernedCit', naverId: 'NAVER-C93810', content: 'Anyone else seeing the blockages along Ring Road? Maintenance needs to get on that.', topic: 'Share Your Thoughts', likes: 21 },
  { id: 'seed-7', userName: 'GreenRoofDev', naverId: 'NAVER-G40291', content: 'We are testing green roofs on the new tech hub to absorb runoff. Results look promising!', topic: 'Share Your Thoughts', likes: 17 },
  { id: 'seed-8', userName: 'PlumbExpert', naverId: 'NAVER-P19284', content: 'Make sure your non-return valves are clear, or you might get reverse flow from the main line.', topic: 'Share Your Thoughts', likes: 38 },
  { id: 'seed-9', userName: 'WeatherWatch', naverId: 'NAVER-W68291', content: 'Heavier rains predicted tomorrow. Clear your gutters tonight!', topic: 'Share Your Thoughts', likes: 16 },
];

export default function ForumSidebar() {
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string; content?: string } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('taskmolly_forum_likes') || '{}');
    } catch {
      return {};
    }
  });
  const [likesDelta, setLikesDelta] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('taskmolly_forum_likes_delta') || '{}');
    } catch {
      return {};
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

      // Seed fallback messages if low count
      if (msgs.length < 3) {
        const fakeMsgs = DUMMY_COMMENTS.map((c, i) => ({
          id: c.id || `seed-${i}`,
          userId: `seed-${i}`,
          userName: c.userName!,
          naverId: c.naverId || `NAVER-S${10000 + i}`,
          content: c.content!,
          topic: 'Share Your Thoughts',
          likes: c.likes ?? 10,
          timestamp: new Date()
        })) as ForumMessage[];
        msgs = [...msgs, ...fakeMsgs];
      }

      setMessages(msgs);

      // Welcome note: lets users know that a Naver ID will be assigned when commenting
      const hasMention = msgs.some(m => m.content.includes(`@${guestName}`));
      if (!hasMention && msgs.length > 0) {
        const testMention: ForumMessage = {
          id: 'test-mention',
          userId: 'system',
          userName: 'TaskMollyBot',
          naverId: 'NAVER-OFFICIAL',
          content: `Welcome to the community @${guestName}! 🤝 Please note that a unique Naver ID will automatically be assigned to you whenever you share a comment.`,
          topic: 'Share Your Thoughts',
          likes: 7,
          timestamp: new Date()
        };
        setMessages(prev => [testMention, ...prev]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'forum');
    });

    return () => unsubscribe();
  }, [guestName]);

  const handleToggleLike = async (commentId: string) => {
    const isCurrentlyLiked = likedPosts[commentId] || false;
    const nextLiked = !isCurrentlyLiked;
    const currentDelta = likesDelta[commentId] || 0;
    const nextDelta = isCurrentlyLiked ? currentDelta - 1 : currentDelta + 1;

    setLikedPosts(prev => {
      const updated = { ...prev, [commentId]: nextLiked };
      localStorage.setItem('taskmolly_forum_likes', JSON.stringify(updated));
      return updated;
    });

    setLikesDelta(prev => {
      const updated = { ...prev, [commentId]: nextDelta };
      localStorage.setItem('taskmolly_forum_likes_delta', JSON.stringify(updated));
      return updated;
    });

    // Best effort Firestore sync
    if (!commentId.startsWith('seed-') && !commentId.startsWith('test-')) {
      try {
        await updateDoc(doc(db, 'forum', commentId), {
          likes: increment(nextLiked ? 1 : -1)
        });
      } catch (err) {
        console.warn("Optimistic like used, Firestore sync skipped:", err);
      }
    }
  };

  // Instagram-style Reply: Focuses the typing bar below without any popup mini screen
  const handleStartReply = (msg: ForumMessage) => {
    setReplyingTo({
      id: msg.id,
      userName: msg.userName,
      content: msg.content
    });
    setNewMessage(`@${msg.userName} `);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = auth.currentUser;
    const finalUserName = user?.displayName || guestName || 'Anonymous Guest';
    const finalUserId = user?.uid || `guest-${guestName}`;

    // Always generate a fresh unique Naver ID every time someone shares a comment
    const assignedNaverId = generateNaverId();

    // Detect mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      mentions.push(match[1]);
    }

    const payload = {
      userId: finalUserId,
      userName: finalUserName,
      naverId: assignedNaverId,
      userAvatar: user?.photoURL || '',
      content: newMessage.trim(),
      topic: 'Share Your Thoughts',
      mentions: mentions,
      likes: 0,
      replyToId: replyingTo?.id || null,
      replyToUser: replyingTo?.userName || null,
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'forum'), payload);
      const optimisticMsg: ForumMessage = {
        id: docRef.id,
        ...payload,
        timestamp: new Date()
      };
      setMessages(prev => [optimisticMsg, ...prev]);
      
      setNewMessage('');
      setReplyingTo(null);
      
      // Scroll to top so user sees newly posted comment with their Naver ID
      if (commentsScrollRef.current) {
        commentsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forum');
    }
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

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* Comments Feed: Scrollable, fitting the entire second section seamlessly */}
      <div 
        ref={commentsScrollRef}
        className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 no-scrollbar scroll-smooth min-h-0"
      >
        {messages.map((msg, i) => {
          const isMentioned = msg.content.includes(`@${guestName}`) || (auth.currentUser?.displayName && msg.content.includes(`@${auth.currentUser.displayName}`));
          const isLiked = likedPosts[msg.id] || false;
          const baseLikes = typeof msg.likes === 'number' ? msg.likes : 0;
          const delta = likesDelta[msg.id] || 0;
          const totalLikes = Math.max(0, baseLikes + delta);
          const isTargetOfReply = replyingTo?.id === msg.id;

          return (
            <div 
              key={`${msg.id}-${i}`}
              className={`p-3 rounded-xl border transition-all ${
                isTargetOfReply
                  ? 'bg-accent-gold/15 border-accent-gold shadow-sm ring-1 ring-accent-gold/30'
                  : isMentioned 
                  ? 'bg-accent-gold/10 border-accent-gold/40 shadow-xs' 
                  : 'bg-primary-bg/40 border-warm-gray/40 hover:border-warm-gray shadow-xs'
              }`}
            >
              {/* Header Row: User Info, Assigned Naver ID & Far Right Like Button */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-warm-gray/25 flex-shrink-0 flex items-center justify-center text-[10px] text-rich-black/70 font-bold uppercase">
                  {msg.userName.charAt(0)}
                </div>
                
                {/* Name and Naver ID Badge */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-rich-black truncate">
                    {msg.userName}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-accent-gold/10 text-accent-gold border border-accent-gold/25 font-bold tracking-tight shrink-0">
                    {msg.naverId || 'NAVER-ID'}
                  </span>
                </div>

                {/* Like Button: Far right of each comment showing number of likes */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLike(msg.id);
                  }}
                  className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all shrink-0 cursor-pointer ${
                    isLiked 
                      ? 'bg-red-50 text-red-500 font-bold border border-red-200' 
                      : 'text-rich-black/40 hover:text-red-500 hover:bg-neutral-100 border border-transparent'
                  }`}
                  title={isLiked ? "Unlike" : "Like"}
                >
                  <Heart 
                    size={12} 
                    className={isLiked ? "fill-red-500 text-red-500" : "text-rich-black/40"} 
                  />
                  <span className="text-[10px] font-bold">
                    {totalLikes}
                  </span>
                </button>
              </div>

              {/* Reply context tag if this comment is a reply */}
              {msg.replyToUser && (
                <div className="flex items-center gap-1 text-[9px] text-accent-gold font-bold mb-1 pl-1">
                  <CornerDownRight size={10} />
                  <span>Replying to @{msg.replyToUser}</span>
                </div>
              )}

              {/* Content */}
              <p className="text-[11px] leading-relaxed text-rich-black/80 break-words pl-1">
                {renderContent(msg.content, !!isMentioned)}
              </p>

              {/* Footer with Instagram-style Reply Option */}
              <div className="mt-2 pt-1.5 border-t border-warm-gray/25 flex items-center justify-between pl-1">
                <button 
                  type="button"
                  onClick={() => handleStartReply(msg)}
                  className="flex items-center gap-1 text-[10px] font-bold text-accent-gold hover:text-accent-gold/80 hover:underline cursor-pointer transition-colors"
                >
                  <CornerDownRight size={11} />
                  <span>Reply</span>
                </button>
                <span className="text-[9px] text-rich-black/30 font-medium">Community</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instagram-style Docked Input / Reply Bar at the bottom */}
      {/* Generates a Naver ID on send. Keyboard pops up below on mobile while comments remain visible above! */}
      <div className="border-t border-warm-gray/40 bg-white p-3 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1 bg-neutral-100 rounded-lg text-[11px] border border-warm-gray/40 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <span className="text-rich-black/70">
              Replying to <span className="font-bold text-accent-gold">@{replyingTo.userName}</span>
            </span>
            <button 
              type="button" 
              onClick={() => {
                setReplyingTo(null);
                setNewMessage('');
              }} 
              className="text-rich-black/40 hover:text-rich-black cursor-pointer p-0.5 font-bold text-xs"
              title="Cancel reply"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent-gold/15 flex items-center justify-center text-[10px] font-bold text-accent-gold shrink-0">
            {auth.currentUser?.displayName?.charAt(0) || guestName.charAt(0)}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment (Naver ID assigned)..."}
            className="flex-1 bg-primary-bg/70 hover:bg-primary-bg focus:bg-white border border-warm-gray/60 focus:border-accent-gold rounded-full px-3.5 py-2 text-xs text-rich-black placeholder:text-rich-black/40 focus:outline-none transition-all shadow-inner"
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-accent-gold hover:text-accent-gold/80 disabled:opacity-30 disabled:hover:text-accent-gold transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
          >
            <span>Post</span>
            <Send size={11} className="hidden sm:inline" />
          </button>
        </form>
      </div>
    </div>
  );
}
