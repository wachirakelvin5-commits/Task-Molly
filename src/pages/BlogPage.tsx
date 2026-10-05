import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Send, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ForumComment {
  id: string;
  author: string;
  role?: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

interface ForumVideoPost {
  id: string;
  title: string;
  author: string;
  handle: string;
  avatar: string;
  proRole: string;
  proProfileTag: string;
  verified: boolean;
  videoUrl: string;
  posterUrl: string;
  likesCount: number;
  initialCommentsCount: number;
  commentary: {
    summary: string;
    fullText: string;
    keyTakeaways: string[];
  };
  comments: ForumComment[];
}

const FORUM_VIDEOS: ForumVideoPost[] = [
  {
    id: 'post-1',
    title: 'How to Fix a Leaky Pipe & Water Tank Ball Valves in High-Pressure Flats',
    author: 'Fundi Juma Mwangi',
    handle: '@fundijuma_plumbing',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    proRole: 'Licensed Master Plumber',
    proProfileTag: 'Fundi Juma • Licensed Plumber',
    verified: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-plumber-working-under-a-sink-41487-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=1200&auto=format&fit=crop',
    likesCount: 1420,
    initialCommentsCount: 48,
    commentary: {
      summary: 'Underground and rooftop water tanks frequently overflow during nocturnal high-pressure pumping cycles in Nairobi estates. Here is the exact fix for faulty ball cock valves.',
      fullText: `When estates in Nairobi like Kilimani, Westlands, and Syokimau receive mains water at night, water pressure can exceed 4.5 bars. Standard plastic float valves will flex under this pressure, failing to seal completely and causing thousands of liters of treated water to spill onto roofs and driveways.

To permanently resolve this:
1. Always replace lightweight plastic valve stems with brass or heavy-duty brass-jointed bronze ball valves rated for up to 6 bars.
2. Ensure the float arm is angled downward by 15 degrees so the buoyant force of the hollow float exerts maximum mechanical leverage against the washer.
3. Clean the inlet nozzle from silt and sand particles brought by municipal lines. Fine grit prevents the rubber diaphragm from sitting flush.
4. If your tank has an overflow pipe, ensure it discharges into a visible catchment area rather than the storm drain so you notice failures instantly.`,
      keyTakeaways: [
        'Use brass-jointed valves for mains pressures over 3 bars',
        'Angle float arm downward 15 degrees for maximum torque',
        'Flush out grit every 3 months to protect the rubber diaphragm',
        'Average replacement fundi cost: KES 1,500 - 2,500'
      ]
    },
    comments: [
      {
        id: 'c-1',
        author: 'David Otieno',
        role: 'Verified Client',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop',
        content: 'This happened at my apartment building last weekend! The water was running down the stairwell until 3 AM. Changing to a brass valve fixed it immediately.',
        timestamp: '2h ago',
        likes: 24,
        isLiked: true
      },
      {
        id: 'c-2',
        author: 'Mercy Wambui',
        role: 'Verified Pro',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&auto=format&fit=crop',
        content: 'Pro tip for plumbers: Always install an accessible isolation gate valve right before the float valve so you don’t have to empty the whole riser pipe when servicing.',
        timestamp: '4h ago',
        likes: 38
      },
      {
        id: 'c-3',
        author: 'Brian Ochieng',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop',
        content: 'Does Task Molly have fundis who carry the heavy-duty brass valves directly on site or do I need to purchase it at the local hardware store first?',
        timestamp: '6h ago',
        likes: 12
      },
      {
        id: 'c-4',
        author: 'Faith Kilonzo',
        role: 'Homeowner',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop',
        content: 'Great demonstration! Very clear and easy to understand even for non-technical homeowners.',
        timestamp: '8h ago',
        likes: 7
      }
    ]
  },
  {
    id: 'post-2',
    title: 'The Mama Fua Guide: Removing Stubborn Red Volcanic Soil & Grass Stains',
    author: 'Mama Grace (Grace Njeri)',
    handle: '@grace_cleanpro',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=200&auto=format&fit=crop',
    proRole: '5★ Verified Mama Fua Specialist',
    proProfileTag: 'Mama Grace • 5★ Mama Fua',
    verified: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cleaning-the-kitchen-counter-with-a-sponge-41484-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop',
    likesCount: 2310,
    initialCommentsCount: 65,
    commentary: {
      summary: 'Kenya’s red volcanic soil in Nairobi, Kiambu, and Rift Valley contains high iron oxide that binds aggressively to cotton fabrics. Never use hot water first.',
      fullText: `Red volcanic loam in Kenya contains microscopic iron oxide crystals that act like permanent dye if heat or harsh alkaline bleach is introduced too quickly.

Here is the professional laundry method developed by experienced Mama Fuas:
1. Let the mud dry completely first: Never rub fresh wet mud into the fabric weave. Brush off the dry crust with a stiff bristled brush.
2. Cold Water Pre-Rinse: Flush from the REVERSE side of the fabric with cold water so the particles are pushed outward.
3. The Secret Paste: Mix equal parts sodium bicarbonate (baking soda) and mild dishwashing liquid with a splash of white vinegar. Rub gently into the fibers and allow it to sit for 25 minutes.
4. Sun Drying: Spread white linen in direct morning sunlight. UV rays naturally oxidize any lingering pale yellow iron tint without weakening the cotton fibers like chlorine bleach does.`,
      keyTakeaways: [
        'Never use hot water on fresh red soil—it sets the iron stain permanently',
        'Dry and brush off dry mud first before any wetting',
        'Baking soda + dish soap + vinegar paste breaks the mineral bond',
        'Use morning sun bleaching instead of harsh chlorine'
      ]
    },
    comments: [
      {
        id: 'c-201',
        author: 'Esther Mutuku',
        role: 'Mama Fua Pro',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=120&auto=format&fit=crop',
        content: 'Asante sana Mama Grace! This vinegar paste works miracles on school uniforms for kids who play football on Kiambu red fields.',
        timestamp: '1h ago',
        likes: 54,
        isLiked: true
      },
      {
        id: 'c-202',
        author: 'Kelvin Wachira',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop',
        content: 'Can this also be applied on delicate silk or strictly cotton and polyester fabrics?',
        timestamp: '3h ago',
        likes: 19
      },
      {
        id: 'c-203',
        author: 'Amina Hassan',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=120&auto=format&fit=crop',
        content: 'Saved this video! I have ruined so many white bedsheets trying to soak them in hot water.',
        timestamp: '5h ago',
        likes: 31
      }
    ]
  },
  {
    id: 'post-3',
    title: 'Home Solar & Inverter Backup: 5 Common Electrical Wiring Mistakes to Avoid',
    author: 'Eng. Paul Karanja',
    handle: '@karanja_solar_ke',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    proRole: 'Certified Master Electrician',
    proProfileTag: 'Eng. Paul • Solar Electrician',
    verified: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-carpenter-measuring-a-piece-of-wood-41485-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1200&auto=format&fit=crop',
    likesCount: 1890,
    initialCommentsCount: 52,
    commentary: {
      summary: 'Blackouts in Kenyan neighborhoods often lead households to install inverter battery backup systems. Improper neutral bonding can fry circuit boards and trip breakers.',
      fullText: `Installing a hybrid solar inverter requires precision separation of critical and non-critical distribution boards. 

Common hazards identified by licensed Kenyan electricians:
1. Shared Neutral Loop: Never loop the KPLC grid neutral line back into the inverter output neutral. This creates a floating ground that destroys surge protectors and smart TVs.
2. Overloading Instant Showers: A 7.5kW instant water heater must NEVER be on the inverter backup side unless you have a dedicated 15kVA commercial setup with high-C discharge lithium batteries.
3. Undersized DC Cable Gauge: DC wiring between battery bank and inverter carries heavy amperage. Using 16mm² instead of 35mm² causes terminal overheating and potential fire hazards.
4. Lack of Manual Changeover Switch: Always install a physical 3-position manual bypass switch (Grid - Off - Inverter) so the house can run normally when the inverter undergoes maintenance.`,
      keyTakeaways: [
        'Strictly isolate the inverter output neutral from KPLC neutral',
        'Keep instant showers and heavy heating elements off the inverter line',
        'Use minimum 25mm² - 35mm² pure copper DC cables with hydraulic lugs',
        'Always include an ATS or manual 63A changeover switch'
      ]
    },
    comments: [
      {
        id: 'c-301',
        author: 'Samuel Kiprop',
        role: 'Electrical Fundi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=120&auto=format&fit=crop',
        content: 'Shared neutral is the number one callout I get in Rongai! People hire unqualified handymen who connect grounds wrong.',
        timestamp: '2h ago',
        likes: 29
      },
      {
        id: 'c-302',
        author: 'Christine Adhiambo',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop',
        content: 'What is the recommended battery capacity to run a double door fridge and WiFi during a 6-hour power outage?',
        timestamp: '4h ago',
        likes: 15
      }
    ]
  },
  {
    id: 'post-4',
    title: 'Rainwater Harvesting & French Drains for Muddy Residential Compounds',
    author: 'Sammy Kamau (Compound Design KE)',
    handle: '@sammy_landscapes',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=200&auto=format&fit=crop',
    proRole: 'Compound Landscaping Pro',
    proProfileTag: 'Sammy Kamau • Landscaping Pro',
    verified: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gardener-pruning-plants-in-a-greenhouse-41486-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?q=80&w=1200&auto=format&fit=crop',
    likesCount: 980,
    initialCommentsCount: 34,
    commentary: {
      summary: 'Prevent compound flooding, slippery walkways, and foundation erosion during heavy rainfall with passive french drains and geo-textile wrapped trenches.',
      fullText: `Compounds with poorly graded driveways accumulate standing water that turns to deep sludge and attracts mosquitoes. A french drain is an underground ditch filled with perforated pipe and aggregate gravel that channels surface water away naturally without expensive pumps.

Implementation guidelines:
1. Dig a trench 1.5 feet deep by 1 foot wide with a continuous 1% downward slope toward the natural storm outlet or soak-away pit.
2. Line the ditch with non-woven geotextile fabric. This lets water seep in while keeping dirt and mud from clogging the rocks over time.
3. Lay a 4-inch perforated PVC pipe holes-facing-downwards over a 2-inch base of washed ballast gravel.
4. Backfill with coarse drainage gravel to within 3 inches of the lawn level, fold the fabric overlap, and cover with decorative river pebbles or sod.`,
      keyTakeaways: [
        'Maintain a 1% slope (1 inch drop per 10 feet of pipe run)',
        'Always wrap aggregate in geotextile fabric to prevent mud silting',
        'Turn holes of perforated pipe downward for optimum suction',
        'Cost effective DIY or book a Task Molly landscape pro'
      ]
    },
    comments: [
      {
        id: 'c-401',
        author: 'Denis Maina',
        role: 'Landscape Pro',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop',
        content: 'French drains saved my backyard in Ruiru! The water used to pool right next to the kitchen porch.',
        timestamp: '3h ago',
        likes: 18
      }
    ]
  }
];

export default function BlogPage() {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCommentaryExpanded, setIsCommentaryExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playingMap, setPlayingMap] = useState<Record<number, boolean>>({ 0: true });
  const [newCommentText, setNewCommentText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [postLikesCount, setPostLikesCount] = useState<Record<string, number>>({});
  const [postComments, setPostComments] = useState<Record<string, ForumComment[]>>({});
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize post state
  useEffect(() => {
    const initialComments: Record<string, ForumComment[]> = {};
    const initialLikes: Record<string, number> = {};
    
    FORUM_VIDEOS.forEach(post => {
      initialComments[post.id] = post.comments;
      initialLikes[post.id] = post.likesCount;
    });

    setPostComments(initialComments);
    setPostLikesCount(initialLikes);
  }, []);

  // Control video play/pause on active video index change
  useEffect(() => {
    videoRefs.current.forEach((videoEl, index) => {
      if (videoEl) {
        if (index === currentVideoIndex) {
          videoEl.currentTime = 0;
          videoEl.play().then(() => {
            setPlayingMap(prev => ({ ...prev, [index]: true }));
          }).catch(() => {
            setPlayingMap(prev => ({ ...prev, [index]: false }));
          });
        } else {
          videoEl.pause();
          setPlayingMap(prev => ({ ...prev, [index]: false }));
        }
      }
    });
    setIsSheetOpen(false);
    setIsCommentaryExpanded(false);
  }, [currentVideoIndex]);

  const togglePlay = (index: number) => {
    const videoEl = videoRefs.current[index];
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
      setPlayingMap(prev => ({ ...prev, [index]: true }));
    } else {
      videoEl.pause();
      setPlayingMap(prev => ({ ...prev, [index]: false }));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRefs.current.forEach(videoEl => {
      if (videoEl) videoEl.muted = nextMuted;
    });
    toast.info(nextMuted ? "Audio muted" : "Audio unmuted", { duration: 1500 });
  };

  const handleLikeToggle = (postId: string) => {
    const isCurrentlyLiked = likedPosts[postId] || false;
    const currentCount = postLikesCount[postId] || 0;

    setLikedPosts(prev => ({
      ...prev,
      [postId]: !isCurrentlyLiked
    }));

    setPostLikesCount(prev => ({
      ...prev,
      [postId]: isCurrentlyLiked ? currentCount - 1 : currentCount + 1
    }));

    if (!isCurrentlyLiked) {
      toast.success("Added to liked videos!");
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const currentPost = FORUM_VIDEOS[currentVideoIndex];
    const userProfileStr = localStorage.getItem('taskmolly_mock_user');
    let userName = 'Kelvin Wachira';
    let userAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop';
    
    if (userProfileStr) {
      try {
        const parsed = JSON.parse(userProfileStr);
        if (parsed.displayName) userName = parsed.displayName;
        if (parsed.photoURL) userAvatar = parsed.photoURL;
      } catch (err) {}
    }

    const newComment: ForumComment = {
      id: `comment-${Date.now()}`,
      author: userName,
      role: 'Member',
      avatar: userAvatar,
      content: newCommentText.trim(),
      timestamp: 'Just now',
      likes: 0
    };

    setPostComments(prev => ({
      ...prev,
      [currentPost.id]: [newComment, ...(prev[currentPost.id] || [])]
    }));

    setNewCommentText('');
    toast.success("Comment posted to forum discussion!");
  };

  const handleLikeComment = (commentId: string) => {
    const currentPost = FORUM_VIDEOS[currentVideoIndex];
    setPostComments(prev => {
      const currentList = prev[currentPost.id] || [];
      const updated = currentList.map(c => {
        if (c.id === commentId) {
          const isLiked = c.isLiked || false;
          return {
            ...c,
            likes: isLiked ? c.likes - 1 : c.likes + 1,
            isLiked: !isLiked
          };
        }
        return c;
      });
      return {
        ...prev,
        [currentPost.id]: updated
      };
    });
  };

  const scrollToVideo = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const targetCard = container.children[index] as HTMLElement;
      if (targetCard) {
        container.scrollTo({
          left: targetCard.offsetLeft,
          behavior: 'smooth'
        });
      }
    }
    setCurrentVideoIndex(index);
  };

  const nextVideo = () => {
    const nextIdx = (currentVideoIndex + 1) % FORUM_VIDEOS.length;
    scrollToVideo(nextIdx);
  };

  const prevVideo = () => {
    const prevIdx = (currentVideoIndex - 1 + FORUM_VIDEOS.length) % FORUM_VIDEOS.length;
    scrollToVideo(prevIdx);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollPos = container.scrollLeft;
      const cardWidth = container.clientWidth;
      if (cardWidth > 0) {
        const newIndex = Math.round(scrollPos / cardWidth);
        if (newIndex >= 0 && newIndex < FORUM_VIDEOS.length && newIndex !== currentVideoIndex) {
          setCurrentVideoIndex(newIndex);
        }
      }
    }
  };

  const handleBack = () => {
    const mockUserStr = localStorage.getItem('taskmolly_mock_user');
    let target = '/dashboard';
    if (mockUserStr) {
      try {
        const u = JSON.parse(mockUserStr);
        if (u.role === 'tasker') {
          target = '/provider-dashboard';
        }
      } catch (e) {}
    }
    navigate(target);
  };

  const currentActivePost = FORUM_VIDEOS[currentVideoIndex];
  const activeComments = postComments[currentActivePost.id] || currentActivePost.comments;

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-white text-rich-black overflow-hidden flex flex-col items-center justify-between pt-16 md:pt-18 pb-2 px-2 md:px-4 relative font-sans select-none">
      
      {/* Top Header Bar: Removed back arrow before M profile, removed 'Community Video Feed' */}
      <header className="w-full max-w-md flex items-center justify-between px-3 py-1.5 z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-gold text-white font-black flex items-center justify-center text-sm shadow-md">
            M
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black tracking-tight text-rich-black">Open Forum</h1>
            <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />
          </div>
        </div>

        {/* Video switcher count and navigation buttons */}
        <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full border border-warm-gray/60">
          <span className="text-[11px] font-black text-rich-black">
            {currentVideoIndex + 1}
          </span>
          <span className="text-[10px] text-rich-black/40 font-bold">/</span>
          <span className="text-[10px] text-rich-black/40 font-bold">
            {FORUM_VIDEOS.length}
          </span>
          <div className="flex items-center gap-1 ml-1.5">
            <button
              onClick={prevVideo}
              className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
              title="Previous Video"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={nextVideo}
              className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
              title="Next Video"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Video Carousel: Horizontally Scrollable Right to Left */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full max-w-md flex-1 relative flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar my-1 items-stretch"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {FORUM_VIDEOS.map((post, index) => {
          const isPostLiked = likedPosts[post.id] || false;
          const likesCount = postLikesCount[post.id] ?? post.likesCount;
          const commentsCount = (postComments[post.id] || post.comments).length;
          const isPlaying = playingMap[index] ?? (index === currentVideoIndex);

          return (
            <div
              key={post.id}
              className="w-full min-w-full max-w-full h-full snap-center shrink-0 relative rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-warm-gray/60 flex flex-col justify-end"
            >
              {/* Background Video */}
              <div 
                onClick={() => togglePlay(index)}
                className="absolute inset-0 w-full h-full cursor-pointer z-0 overflow-hidden bg-black flex items-center justify-center"
              >
                <video
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={post.videoUrl}
                  poster={post.posterUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover scale-[1.02]"
                />

                {/* Pause icon overlay */}
                {!isPlaying && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute w-16 h-16 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center z-10"
                  >
                    <Play size={28} className="translate-x-0.5" />
                  </motion.div>
                )}

                {/* Vignette gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />
              </div>

              {/* Top Pro Profile Badge and Mute Controls */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md border border-accent-gold/40 text-white shadow-md">
                    <img 
                      src={post.avatar} 
                      alt={post.author} 
                      className="w-4 h-4 rounded-full object-cover border border-accent-gold" 
                    />
                    <span className="text-accent-gold font-mono">PRO PROFILE:</span>
                    <span className="text-white/95">{post.proRole}</span>
                  </div>
                </div>

                <button
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all pointer-events-auto cursor-pointer shadow-md"
                  title={isMuted ? "Unmute sound" : "Mute sound"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* Right Action Bar */}
              <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-4 text-white">
                {/* Like Button */}
                <button
                  onClick={() => handleLikeToggle(post.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <motion.div 
                    whileTap={{ scale: 1.3 }}
                    className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                      isPostLiked 
                        ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-black/40 border border-white/20 text-white hover:bg-black/60'
                    }`}
                  >
                    <Heart size={20} fill={isPostLiked ? "currentColor" : "none"} />
                  </motion.div>
                  <span className="text-[11px] font-bold drop-shadow-md">
                    {likesCount >= 1000 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                  </span>
                </button>

                {/* Comment Trigger Button */}
                <button
                  onClick={() => {
                    setCurrentVideoIndex(index);
                    setIsSheetOpen(true);
                  }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all">
                    <MessageCircle size={20} />
                  </div>
                  <span className="text-[11px] font-bold drop-shadow-md">
                    {commentsCount}
                  </span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Forum link copied to clipboard!");
                    } else {
                      toast.success("Shared video!");
                    }
                  }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all">
                    <Share2 size={18} />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow-md">Share</span>
                </button>

                {/* Save Bookmark Button */}
                <button
                  onClick={() => toast.success("Saved to your forum bookmarks!")}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all">
                    <Bookmark size={18} />
                  </div>
                </button>
              </div>

              {/* Video Metadata */}
              <div className="relative z-10 p-4 md:p-5 w-full pr-16 text-white space-y-2">
                {/* Creator Profile */}
                <div className="flex items-center gap-2.5">
                  <img 
                    src={post.avatar} 
                    alt={post.author} 
                    className="w-9 h-9 rounded-full object-cover border-2 border-accent-gold"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate text-white">{post.author}</span>
                      {post.verified && (
                        <CheckCircle2 size={13} className="text-accent-gold fill-accent-gold text-rich-black shrink-0" />
                      )}
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-accent-gold text-rich-black">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-white/80 font-medium">
                      {post.proRole} • <span className="font-mono text-accent-gold/90">{post.handle}</span>
                    </p>
                  </div>
                </div>

                {/* Video Title */}
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white leading-snug drop-shadow-md">
                    {post.title}
                  </h2>
                </div>
              </div>
            </div>
          );
        })}

        {/* Half-Page Sliding Drawer for Commentary & Comments */}
        <AnimatePresence>
          {isSheetOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSheetOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-30 cursor-pointer"
              />

              {/* Half-Page White Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 h-1/2 max-h-[50%] bg-white rounded-t-[2.2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.25)] z-40 border-t border-warm-gray/60 flex flex-col overflow-hidden text-rich-black"
              >
                {/* Drawer Header */}
                <div className="pt-2 px-5 pb-2 border-b border-warm-gray/40 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-gold" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-rich-black">
                      Commentary & Discussion
                    </h3>
                  </div>

                  {/* Drag bar indicator */}
                  <div 
                    onClick={() => setIsSheetOpen(false)}
                    className="w-10 h-1 bg-warm-gray/80 rounded-full cursor-pointer hover:bg-rich-black/40 transition-colors"
                  />

                  {/* Minimize Button */}
                  <button
                    onClick={() => setIsSheetOpen(false)}
                    className="w-7 h-7 rounded-full bg-primary-bg hover:bg-warm-gray/40 flex items-center justify-center text-rich-black/60 hover:text-rich-black transition-colors cursor-pointer"
                    title="Minimize discussion"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Scrollable Commentary & Comments */}
                <div className="flex-1 overflow-y-auto px-4 md:px-5 py-3 space-y-4 no-scrollbar">
                  
                  {/* 1. Commentary Section (Always Comes First) */}
                  <div className="bg-primary-bg rounded-2xl p-3.5 border border-warm-gray/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-accent-gold text-white">
                          Commentary
                        </span>
                        <span className="text-[10px] text-rich-black/40 font-semibold">• Video Insights</span>
                      </div>
                      
                      {/* Minimize / Expand Toggle Button */}
                      <button
                        onClick={() => setIsCommentaryExpanded(!isCommentaryExpanded)}
                        className="text-[10px] font-black text-accent-gold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        {isCommentaryExpanded ? "Show Less" : "Read More"}
                      </button>
                    </div>

                    {/* Commentary Content: Minimisable with "Read More" */}
                    <div className="text-xs text-rich-black/80 leading-relaxed font-normal">
                      <p>{currentActivePost.commentary.summary}</p>

                      <AnimatePresence>
                        {isCommentaryExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2.5 space-y-2.5 border-t border-warm-gray/40 mt-2.5 text-rich-black/75"
                          >
                            <div className="whitespace-pre-line font-light leading-relaxed text-[11px]">
                              {currentActivePost.commentary.fullText}
                            </div>

                            {/* Key Takeaways */}
                            <div className="bg-white rounded-xl p-2.5 border border-warm-gray/40 mt-2">
                              <p className="text-[10px] uppercase font-black tracking-wider text-accent-gold mb-1.5 flex items-center gap-1">
                                <Sparkles size={11} /> Pro Summary Points
                              </p>
                              <ul className="space-y-1 text-[11px]">
                                {currentActivePost.commentary.keyTakeaways.map((point, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-accent-gold font-bold">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 2. Comments Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-rich-black">
                        Community Discussion
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-warm-gray/40 text-rich-black/60 rounded-full">
                        {activeComments.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-rich-black/40 font-medium">Scrollable Feed</span>
                  </div>

                  {/* 3. Comments List */}
                  <div className="space-y-3 pb-2">
                    {activeComments.map((comment) => (
                      <div 
                        key={comment.id}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-primary-bg/50 transition-colors"
                      >
                        <img 
                          src={comment.avatar} 
                          alt={comment.author}
                          className="w-8 h-8 rounded-full object-cover border border-warm-gray shrink-0 mt-0.5" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-rich-black">{comment.author}</span>
                            {comment.role && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent-gold/15 text-accent-gold">
                                {comment.role}
                              </span>
                            )}
                            <span className="text-[9px] text-rich-black/40">{comment.timestamp}</span>
                          </div>
                          <p className="text-xs text-rich-black/80 mt-1 leading-snug break-words">
                            {comment.content}
                          </p>
                        </div>

                        {/* Comment Like Button */}
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className="flex flex-col items-center text-rich-black/40 hover:text-red-500 transition-colors shrink-0 ml-1 cursor-pointer"
                        >
                          <Heart 
                            size={13} 
                            fill={comment.isLiked ? "#ef4444" : "none"} 
                            className={comment.isLiked ? "text-red-500" : ""} 
                          />
                          <span className="text-[9px] font-bold mt-0.5">
                            {comment.likes}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Bottom Input Bar */}
                <form 
                  onSubmit={handleAddComment}
                  className="p-3 border-t border-warm-gray/50 bg-white flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-primary-bg border border-warm-gray rounded-xl px-3.5 py-2 text-xs text-rich-black focus:outline-none focus:border-accent-gold transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => setNewCommentText(prev => prev + ' 👍')}
                    className="w-8 h-8 rounded-lg hover:bg-primary-bg flex items-center justify-center text-sm cursor-pointer"
                    title="Thumbs up"
                  >
                    👍
                  </button>

                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="w-8 h-8 rounded-xl bg-accent-gold text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-gold/90 transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Post Comment"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Bar: Back Button lowered into dedicated footer bar so it never overlaps the commentary push link */}
      <footer className="w-full max-w-md flex items-center justify-between px-3 pt-2 pb-1 z-20 shrink-0">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 border border-warm-gray hover:border-accent-gold text-rich-black rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 group cursor-pointer"
        >
          <ArrowLeft size={16} className="text-accent-gold group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        {/* Carousel indicators */}
        <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full border border-warm-gray/60">
          {FORUM_VIDEOS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToVideo(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentVideoIndex ? 'w-5 bg-accent-gold' : 'w-1.5 bg-warm-gray hover:bg-rich-black/40'
              }`}
              title={`Go to video ${idx + 1}`}
            />
          ))}
        </div>
      </footer>

    </div>
  );
}
