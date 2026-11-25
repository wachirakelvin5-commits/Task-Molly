import { useState, useEffect, useRef, type UIEvent } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BLOG_POSTS, BlogPost } from '../constants/blogData';
import { useSwipe } from '../hooks/useSwipe';

// Priority Intelligence: the published-articles carousel (shown in Fun Facts).
export default function PriorityIntelligence({
  onSelect,
  paused = false,
}: {
  onSelect: (post: BlogPost) => void;
  paused?: boolean;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('rtl');
  const [isHovered, setIsHovered] = useState(false);
  const trayX = useMotionValue(-33.3333);
  const displayX = useTransform(trayX, (val) => `${val}%`);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef(0);
  const snapRef = useRef<ReturnType<typeof animate> | null>(null);

  // Triple the posts for a seamless loop [Clone 1, Real Set, Clone 2]
  const featured = [...BLOG_POSTS, ...BLOG_POSTS, ...BLOG_POSTS];

  useEffect(() => {
    if (isPaused || isHovered || paused) {
      if (animationRef.current) animationRef.current.stop();
      return;
    }

    const unitSize = 100 / 3; // 33.333% is the width of one set
    const from = -unitSize;
    const to = -unitSize * 2;

    const animateLoop = () => {
      const currentX = trayX.get();
      const targetX = direction === 'rtl' ? to : from;

      animationRef.current = animate(trayX, targetX, {
        duration: 100 * (Math.abs(targetX - currentX) / unitSize),
        ease: 'linear',
        onComplete: () => {
          // Snap back to the opposite side of the middle section for infinite loop
          trayX.set(direction === 'rtl' ? from : to);
          animateLoop();
        },
      });
    };

    animateLoop();

    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, [isPaused, direction, isHovered, paused, trayX]);

  useEffect(() => () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  }, []);

  const handleManualNav = (navDirection: 'left' | 'right') => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (animationRef.current) animationRef.current.stop();

    setIsPaused(true);

    const currentX = trayX.get();
    const nudgeSize = (100 / 3) / BLOG_POSTS.length; // Size of exactly one article
    const targetX = navDirection === 'left' ? currentX + nudgeSize : currentX - nudgeSize;

    animate(trayX, targetX, {
      duration: 0.5,
      ease: 'easeOut',
      onComplete: () => {
        const val = trayX.get();
        const unit = 100 / 3;
        if (val > -unit) trayX.set(val - unit);
        if (val < -unit * 2) trayX.set(val + unit);
      },
    });

    pauseTimerRef.current = setTimeout(() => {
      setDirection('rtl');
      setIsPaused(false);
    }, 5000);
  };

  // Keep the tray inside the middle copy of the posts (-33.33% to -66.66%).
  const wrapTray = (val: number) => {
    const unit = 100 / 3;
    while (val > -unit) val -= unit;
    while (val < -unit * 2) val += unit;
    return val;
  };

  // Swipe left/right with a finger or mouse. Auto-play stops while held and
  // resumes as soon as the cards settle after letting go.
  const swipeHandlers = useSwipe({
    onStart: () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (animationRef.current) animationRef.current.stop();
      if (snapRef.current) snapRef.current.stop();
      trayX.stop();
      setIsPaused(true);
      dragStartRef.current = trayX.get();
    },
    onMove: (dx) => {
      const width = trayRef.current?.offsetWidth || 1;
      trayX.set(wrapTray(dragStartRef.current + (dx / width) * 100));
    },
    onEnd: (velocity) => {
      const width = trayRef.current?.offsetWidth || 1;
      const nudgeSize = (100 / 3) / BLOG_POSTS.length;
      const projected = trayX.get() + ((velocity * 200) / width) * 100;
      const targetX = Math.round(projected / nudgeSize) * nudgeSize;
      snapRef.current = animate(trayX, targetX, {
        duration: 0.4,
        ease: 'easeOut',
        onComplete: () => {
          trayX.set(wrapTray(trayX.get()));
          setDirection('rtl');
          setIsPaused(false);
        },
      });
    },
  });

  return (
    <div className="bg-white">
      {/* Featured Carousel */}
      <div
        className="flex-shrink-0 pt-4 md:pt-6 relative group/carousel-main"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setIsHovered(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setIsHovered(false); }}
      >
        <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
          <div className="text-[10px] text-accent-gold uppercase tracking-[0.3em] font-bold">Priority Intelligence</div>
          <div className="flex gap-2">
            {BLOG_POSTS.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-gold/20" />
            ))}
          </div>
        </div>

        <button
          onClick={() => handleManualNav('left')}
          aria-label="Previous article"
          className="absolute left-6 top-[55%] -translate-y-1/2 z-30 w-11 h-11 bg-white/90 backdrop-blur-sm border border-warm-gray rounded-full flex items-center justify-center text-rich-black shadow-lg hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel-main:opacity-100"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => handleManualNav('right')}
          aria-label="Next article"
          className="absolute right-6 top-[55%] -translate-y-1/2 z-30 w-11 h-11 bg-white/90 backdrop-blur-sm border border-warm-gray rounded-full flex items-center justify-center text-rich-black shadow-lg hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel-main:opacity-100"
        >
          <ChevronRight size={22} />
        </button>

        <div
          className="overflow-hidden relative no-scrollbar touch-pan-y select-none cursor-grab active:cursor-grabbing"
          {...swipeHandlers}
        >
          <motion.div
            ref={trayRef}
            style={{ x: displayX, width: 'max-content' }}
            className="flex pb-4"
          >
            {featured.map((post, idx) => (
              <motion.div
                key={`featured-${post.id}-${idx}`}
                onClick={() => onSelect(post)}
                className="min-w-[260px] md:min-w-[360px] h-[165px] md:h-[215px] group relative rounded-[1.6rem] overflow-hidden border border-warm-gray bg-primary-bg cursor-pointer hover:border-accent-gold/50 transition-all shadow-xl flex-shrink-0 mr-4"
              >
                <img
                  src={post.image}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover opacity-100 transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 md:bottom-5 md:left-5 md:right-5">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="px-2 py-0.5 bg-accent-gold text-white text-[8px] font-bold uppercase tracking-widest rounded border border-accent-gold/20">
                      {post.category}
                    </span>
                    <span className="text-[9px] text-white/70 font-mono">{post.date}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-medium text-white leading-tight group-hover:text-accent-gold transition-colors">{post.title}</h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

    </div>
  );
}

// The full article, opened from Priority Intelligence.
export function PriorityArticle({ post, onBack }: { post: BlogPost; onBack: () => void }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const handleArticleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollTop(scrollTop + clientHeight >= scrollHeight - 200);
  };

  return (
    <motion.div
      key="article"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      ref={articleRef}
      onScroll={handleArticleScroll}
      className="h-full overflow-y-auto no-scrollbar p-6 md:p-12 relative bg-white"
    >
      <button
        onClick={onBack}
        className="text-accent-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-10 hover:opacity-70 transition-opacity"
      >
        <ChevronLeft size={16} /> Back to Fun Facts
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <span className="inline-block px-3 py-1 bg-rich-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-medium text-rich-black mb-6 leading-[1.1] tracking-tighter">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-[10px] text-rich-black/60 uppercase tracking-[0.2em] font-mono">
            <span>{post.date}</span>
            <div className="w-1 h-1 rounded-full bg-accent-gold" />
            <span>{post.readTime}</span>
          </div>
        </div>

        <div className="aspect-video rounded-3xl overflow-hidden border border-warm-gray mb-12 shadow-xl">
          <img src={post.image} alt="" className="w-full h-full object-cover" />
        </div>

        <div className="prose prose-lg max-w-none prose-headings:text-rich-black prose-strong:text-accent-gold prose-blockquote:border-accent-gold prose-blockquote:bg-primary-bg/50 pb-20">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-medium mt-16 mb-8 text-rich-black" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-medium mt-12 mb-6 text-rich-black" {...props} />,
              p: ({ node, ...props }) => <p className="mb-8 text-rich-black/70 font-light leading-relaxed" {...props} />,
              li: ({ node, ...props }) => <li className="text-rich-black/70 font-light mb-2" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-bold text-accent-gold" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent-gold pl-6 italic text-rich-black/80 my-8" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            onClick={() => articleRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="fixed bottom-12 right-12 md:right-24 w-12 h-12 bg-accent-gold text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
