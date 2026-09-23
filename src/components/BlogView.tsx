import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from 'motion/react';
import { Clock, Calendar, ChevronLeft, ChevronRight, MessageCircle, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BLOG_POSTS, BlogPost } from '../constants/blogData';
import ForumSidebar from './ForumSidebar';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface ForumMessage {
  id: string;
  userName: string;
  content: string;
  topic: string;
}

export default function BlogView() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [topTopicMessages, setTopTopicMessages] = useState<ForumMessage[]>([]);
  const [topTopicName, setTopTopicName] = useState('Flooding & Drainage');
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('rtl');
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const trayX = useMotionValue(-33.3333);
  const displayX = useTransform(trayX, (val) => `${val}%`);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<any>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  // Triple the posts for a seamless loop [Clone 1, Real Set, Clone 2]
  const featured = [...BLOG_POSTS, ...BLOG_POSTS, ...BLOG_POSTS];

  useEffect(() => {
    const q = query(
      collection(db, 'forum'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ForumMessage[];

      // In a real app, we'd calculate the top topic. 
      // For now, we take 'Flooding & Drainage' or the most frequent one found.
      const topics = msgs.map(m => m.topic);
      const topTopic = topics.sort((a,b) =>
        topics.filter(v => v===a).length - topics.filter(v => v===b).length
      ).pop() || 'Flooding & Drainage';
      
      setTopTopicName(topTopic);
      setTopTopicMessages(msgs.filter(m => m.topic === topTopic));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'forum');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // If paused, hovered, or an article is selected, stop animation
    if (isPaused || isHovered || selectedPost) {
      if (animationRef.current) animationRef.current.stop();
      return;
    }

    const unitSize = 100 / 3; // 33.333% is the width of one set
    const from = -unitSize;
    const to = -unitSize * 2;

    // We only animate between -33.33% and -66.66%
    const animateLoop = () => {
      const currentX = trayX.get();
      
      // If we are moving RTL (right to left): trayX goes from -33 to -66
      // If direction is RTL, target is -66.66. If LTR, target is -33.33.
      const targetX = direction === 'rtl' ? to : from;

      animationRef.current = animate(trayX, targetX, {
        duration: 100 * (Math.abs(targetX - currentX) / unitSize),
        ease: "linear",
        onComplete: () => {
          // Snap back to the opposite side of the middle section for infinite loop
          trayX.set(direction === 'rtl' ? from : to);
          animateLoop();
        }
      });
    };

    animateLoop();

    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, [isPaused, direction, isHovered, selectedPost, trayX]);

  const handleManualNav = (navDirection: 'left' | 'right') => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (animationRef.current) animationRef.current.stop();
    
    setIsPaused(true);
    
    const currentX = trayX.get();
    const nudgeSize = (100 / 3) / BLOG_POSTS.length; // Size of exactly one article
    const targetX = navDirection === 'left' ? currentX + nudgeSize : currentX - nudgeSize;

    animate(trayX, targetX, {
      duration: 0.5,
      ease: "easeOut",
      onComplete: () => {
        // After nudging, check if we need to snap to keep within the middle section
        const val = trayX.get();
        const unit = 100 / 3;
        if (val > -unit) trayX.set(val - unit);
        if (val < -unit * 2) trayX.set(val + unit);
      }
    });
    
    // Set 5 second pause timer
    pauseTimerRef.current = setTimeout(() => {
      setDirection('rtl'); // Resume RTL as requested
      setIsPaused(false);
    }, 5000);
  };

  const handleArticleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Show when reached near bottom (within 200px)
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToArticleTop = () => {
    articleRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-primary-bg overflow-hidden">
      {/* Column 1: Forum Section (Topic of the Day & Live Feed) */}
      <div className="w-full md:w-[380px] lg:w-[420px] h-1/2 md:h-full border-r border-warm-gray flex-shrink-0 flex flex-col overflow-hidden">
        <ForumSidebar />
      </div>

      {/* Column 2: Published Articles Section */}
      <div className="flex-1 flex flex-col h-1/2 md:h-full overflow-hidden bg-white relative">
        <AnimatePresence mode="wait">
          {!selectedPost ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header Stats - Increased Height for Ticker */}
              <div className="h-20 border-b border-warm-gray flex flex-col md:flex-row items-center bg-primary-bg overflow-hidden relative">
                <div className="h-full flex items-center px-6 border-r border-warm-gray bg-white z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-accent-gold whitespace-nowrap">Featured Intelligence</span>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-bold text-rich-black uppercase tracking-widest truncate max-w-[120px]">#{topTopicName}</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
                    </div>
                  </div>
                </div>
                
                {/* Topic #1 Ticker */}
                <div className="flex-1 h-full overflow-hidden relative bg-white/50 group/ticker">
                  <div className="absolute inset-0 flex items-center">
                    <motion.div
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{ 
                        duration: Math.max(20, topTopicMessages.length * 5),
                        ease: "linear",
                        repeat: Infinity
                      }}
                      className="flex items-center gap-8 px-8 whitespace-nowrap"
                    >
                      {[...topTopicMessages, ...topTopicMessages].map((msg, i) => (
                        <div key={`${msg.id}-${i}`} className="flex items-center gap-3">
                          <div className="w-1 h-1 rounded-full bg-warm-gray" />
                          <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">{msg.userName}</span>
                          <span className="text-[11px] text-rich-black/60 font-medium italic">"{msg.content}"</span>
                        </div>
                      ))}
                      {topTopicMessages.length === 0 && (
                        <span className="text-[10px] text-rich-black/20 uppercase tracking-[0.3m]">Awaiting localized intelligence stream...</span>
                      )}
                    </motion.div>
                  </div>
                  <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-primary-bg to-transparent z-10" />
                  <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-primary-bg to-transparent z-10" />
                </div>

                <div className="h-full hidden lg:flex items-center px-6 border-l border-warm-gray bg-white z-10">
                  <div className="text-right">
                    <div className="text-[8px] text-rich-black/20 uppercase font-mono tracking-widest mb-1">STATION_SYNC</div>
                    <div className="text-[10px] font-mono text-accent-gold font-bold">ONLINE_ACTIVE</div>
                  </div>
                </div>
              </div>

              {/* Featured Carousel */}
              <div 
                className="flex-shrink-0 pt-4 md:pt-6 relative group/carousel-main"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="px-6 mb-4 flex items-center justify-between">
                  <div className="text-[10px] text-rich-black/30 uppercase tracking-[0.3em] font-bold">Priority Intelligence</div>
                  <div className="flex gap-2">
                    {BLOG_POSTS.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-gold/20" />
                    ))}
                  </div>
                </div>

                {/* Floating Navigation Buttons - Floating and Disappearing */}
                <button 
                  onClick={() => handleManualNav('left')}
                  className="absolute left-6 top-[60%] -translate-y-1/2 z-30 w-12 h-12 bg-white/90 backdrop-blur-sm border border-warm-gray rounded-full flex items-center justify-center text-rich-black shadow-lg hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel-main:opacity-100"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => handleManualNav('right')}
                  className="absolute right-6 top-[60%] -translate-y-1/2 z-30 w-12 h-12 bg-white/90 backdrop-blur-sm border border-warm-gray rounded-full flex items-center justify-center text-rich-black shadow-lg hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel-main:opacity-100"
                >
                  <ChevronRight size={24} />
                </button>

                <div className="overflow-hidden relative no-scrollbar">
                  <motion.div 
                    style={{ x: displayX, width: "max-content" }}
                    className="flex pb-6"
                  >
                    {featured.map((post, idx) => (
                      <motion.div
                        key={`featured-${post.id}-${idx}`}
                        onClick={() => setSelectedPost(post)}
                        className="min-w-[280px] md:min-w-[400px] h-[200px] md:h-[260px] group relative rounded-[2rem] overflow-hidden border border-warm-gray bg-primary-bg cursor-pointer hover:border-accent-gold/50 transition-all shadow-xl flex-shrink-0 mr-4"
                      >
                        <img 
                          src={post.image} 
                          className="w-full h-full object-cover opacity-100 transition-all duration-700 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-accent-gold text-white text-[8px] font-bold uppercase tracking-widest rounded border border-accent-gold/20">
                              {post.category}
                            </span>
                            <span className="text-[9px] text-white/70 font-mono">{post.date}</span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-medium text-white leading-tight group-hover:text-accent-gold transition-colors">{post.title}</h3>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>

              <div className="flex-1 px-6 pb-10 overflow-y-auto no-scrollbar">

                {/* Horizontal Full Archive List */}
                <div className="mt-4 pt-6 border-t border-warm-gray pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[9px] text-rich-black/30 uppercase tracking-[0.2em] font-bold">Data Archive Explorer</div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
                    {BLOG_POSTS.map((post) => (
                      <motion.button
                        key={`archive-${post.id}`}
                        onClick={() => setSelectedPost(post)}
                        className="min-w-[180px] aspect-video rounded-2xl overflow-hidden border border-warm-gray bg-primary-bg/30 hover:border-accent-gold/30 transition-all snap-start relative group"
                        whileHover={{ y: -4 }}
                      >
                        <img 
                          src={post.image} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" 
                        />
                        <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-white to-transparent">
                          <h4 className="text-[9px] text-rich-black/60 font-medium line-clamp-2 leading-tight">{post.title}</h4>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="article" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }}
              ref={articleRef}
              onScroll={handleArticleScroll}
              className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12 relative"
            >
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-accent-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-10 hover:opacity-70 transition-opacity"
              >
                <ChevronLeft size={16} /> Published Articles
              </button>

              <div className="max-w-3xl mx-auto">
                <div className="mb-10 text-center">
                  <span className="inline-block px-3 py-1 bg-rich-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                    {selectedPost.category}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-medium text-rich-black mb-6 leading-[1.1] tracking-tighter">
                    {selectedPost.title}
                  </h1>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-rich-black/60 uppercase tracking-[0.2em] font-mono">
                    <span>{selectedPost.date}</span>
                    <div className="w-1 h-1 rounded-full bg-accent-gold" />
                    <span>{selectedPost.readTime}</span>
                  </div>
                </div>

                <div className="aspect-video rounded-3xl overflow-hidden border border-warm-gray mb-12 shadow-xl">
                  <img src={selectedPost.image} className="w-full h-full object-cover" />
                </div>

                <div className="prose prose-lg max-w-none prose-headings:text-rich-black prose-strong:text-accent-gold prose-blockquote:border-accent-gold prose-blockquote:bg-primary-bg/50 pb-20">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl font-medium mt-16 mb-8 text-rich-black" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-medium mt-12 mb-6 text-rich-black" {...props} />,
                      p: ({node, ...props}) => <p className="mb-8 text-rich-black/70 font-light leading-relaxed" {...props} />,
                      li: ({node, ...props}) => <li className="text-rich-black/70 font-light mb-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-accent-gold" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent-gold pl-6 italic text-rich-black/80 my-8" {...props} />,
                    }}
                  >
                    {selectedPost.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Scroll to Top Arrow */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    onClick={scrollToArticleTop}
                    className="fixed bottom-12 right-12 md:right-24 w-12 h-12 bg-accent-gold text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
                  >
                    <ArrowUp size={24} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

