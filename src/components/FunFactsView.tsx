import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Droplets, 
  Zap, 
  Sparkles, 
  Shirt, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Waves,
  Scale,
  FileText,
  Plug,
  Home,
  Lightbulb,
  Trash2,
  Heart,
  ShieldCheck,
  Leaf,
  Droplet,
  Cpu,
  Calendar,
  Star,
  Package,
  Wind,
  FileCheck,
  Map,
  Activity,
  Trophy
} from 'lucide-react';
import { FUN_FACTS, FunFact } from '../constants/funFactsData';
import { Link } from 'react-router-dom';

const ICON_MAP: Record<string, any> = {
  Droplets, Zap, Sparkles, Shirt, Flame, CheckCircle2, AlertTriangle, ArrowRight,
  Waves, Scale, FileText, Plug, Home, Lightbulb, Trash2, Heart, ShieldCheck,
  Leaf, Droplet, Cpu, Calendar, Star, Package, Wind, FileCheck, Map, Activity
};

const CATEGORIES = [
  { id: 'all', label: 'All Facts', icon: Filter },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets },
  { id: 'electrical', label: 'Electrical', icon: Zap },
  { id: 'cleaning', label: 'Cleaning', icon: Sparkles },
  { id: 'laundry', label: 'Laundry', icon: Shirt },
  { id: 'firesafety', label: 'Fire Safety', icon: Flame },
];

export default function FunFactsView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewedFacts, setViewedFacts] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('taskMolly_viewedFacts');
    if (saved) setViewedFacts(JSON.parse(saved));
  }, []);

  const markAsViewed = (id: number) => {
    if (!viewedFacts.includes(id)) {
      const newViewed = [...viewedFacts, id];
      setViewedFacts(newViewed);
      localStorage.setItem('taskMolly_viewedFacts', JSON.stringify(newViewed));
    }
  };

  const filteredFacts = useMemo(() => {
    return FUN_FACTS.filter(fact => {
      const matchesCategory = activeCategory === 'all' || fact.category === activeCategory;
      const matchesSearch = fact.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           fact.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const progress = (viewedFacts.length / FUN_FACTS.length) * 100;

  return (
    <div className="h-full flex flex-col bg-primary-bg/30">
      {/* Header & Progress */}
      <div className="p-4 md:p-6 bg-white border-b border-warm-gray sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-accent-gold mb-0.5">
              <Trophy size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fact Master</span>
            </div>
            <h1 className="text-xl font-light text-rich-black leading-tight">Industry Insights</h1>
          </div>
          
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] font-bold text-rich-black/40 uppercase mb-1">
              Progress: <span className="text-accent-gold">{viewedFacts.length}/{FUN_FACTS.length}</span>
            </div>
            <div className="w-24 h-1.5 bg-warm-gray/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent-gold"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rich-black/30" size={16} />
            <input 
              type="text"
              placeholder="Search facts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-warm-gray/10 border border-warm-gray rounded-xl focus:outline-none focus:border-accent-gold transition-colors text-xs"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                  activeCategory === cat.id 
                    ? 'bg-rich-black text-white shadow-md shadow-rich-black/20' 
                    : 'bg-white border border-warm-gray text-rich-black/60 hover:border-accent-gold'
                }`}
              >
                <cat.icon size={12} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Facts Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredFacts.map((fact) => {
              const Icon = ICON_MAP[fact.icon] || CheckCircle2;
              const isViewed = viewedFacts.includes(fact.id);
              
              return (
                <motion.div
                  key={fact.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onViewportEnter={() => markAsViewed(fact.id)}
                  className={`group relative bg-white p-4 rounded-[1.5rem] border transition-all duration-500 ${
                    isViewed ? 'border-warm-gray/50 opacity-80' : 'border-accent-gold/20 shadow-lg shadow-accent-gold/5'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                      isViewed ? 'bg-warm-gray/10 text-rich-black/30' : 'bg-accent-gold/10 text-accent-gold'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-rich-black/30">Fact #{fact.id}</span>
                        {fact.critical && (
                          <span className="flex items-center gap-1 text-[8px] font-bold text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={8} /> Critical
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-rich-black/80 leading-snug font-medium">
                        {fact.text}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[9px] bg-warm-gray/10 text-rich-black/60 px-1.5 py-0.5 rounded-md font-medium">
                      {fact.source}
                    </span>
                    <span className="text-[9px] bg-warm-gray/10 text-rich-black/60 px-1.5 py-0.5 rounded-md font-medium">
                      {fact.year}
                    </span>
                    {fact.verifiedBy && (
                      <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <CheckCircle2 size={8} /> Verified
                      </span>
                    )}
                  </div>

                  <Link 
                    to={fact.linkUrl}
                    className="flex items-center justify-between p-2.5 bg-primary-bg rounded-xl group-hover:bg-accent-gold group-hover:text-white transition-all"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">{fact.linkText}</span>
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredFacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-warm-gray/10 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-rich-black/20" />
            </div>
            <h3 className="text-lg font-medium text-rich-black">No facts found</h3>
            <p className="text-sm text-rich-black/50">Try searching for something else or change the category.</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-20 pt-10 border-t border-warm-gray text-center max-w-2xl mx-auto">
          <p className="text-[10px] text-rich-black/40 uppercase tracking-[0.3em] leading-loose">
            Sources: Kenya National Bureau of Statistics (KNBS 2023), Energy and Petroleum Regulatory Authority (EPRA 2024), 
            Water Services Regulatory Board (WASREB 2024-2025), Kenya Bureau of Standards (KEBS 2023-2024), 
            KEPSA Hygiene Standards, County Fire Regulations, Professional Dry Cleaners Association of Kenya.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-bold text-accent-gold uppercase tracking-widest">
            <span>Last Audit: April 2026</span>
            <span className="w-1 h-1 bg-warm-gray rounded-full" />
            <span>Next Update: July 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
