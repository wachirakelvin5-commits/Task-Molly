import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  Activity
} from 'lucide-react';
import { FUN_FACTS } from '../constants/funFactsData';
import { BlogPost } from '../constants/blogData';
import { Link } from 'react-router-dom';
import PriorityIntelligence, { PriorityArticle } from './PriorityIntelligence';

const ICON_MAP: Record<string, any> = {
  Droplets, Zap, Sparkles, Shirt, Flame, CheckCircle2, AlertTriangle, ArrowRight,
  Waves, Scale, FileText, Plug, Home, Lightbulb, Trash2, Heart, ShieldCheck,
  Leaf, Droplet, Cpu, Calendar, Star, Package, Wind, FileCheck, Map, Activity
};

export default function FunFactsView() {
  const [viewedFacts, setViewedFacts] = useState<number[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('taskMolly_viewedFacts');
    if (saved) {
      try { setViewedFacts(JSON.parse(saved)); } catch { /* ignore a broken saved list */ }
    }
  }, []);

  const markAsViewed = (id: number) => {
    if (!viewedFacts.includes(id)) {
      const newViewed = [...viewedFacts, id];
      setViewedFacts(newViewed);
      localStorage.setItem('taskMolly_viewedFacts', JSON.stringify(newViewed));
    }
  };

  if (selectedPost) {
    return (
      <div className="h-full">
        <PriorityArticle post={selectedPost} onBack={() => setSelectedPost(null)} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-primary-bg/30">
      {/* Priority Intelligence (published articles), then straight into the fun facts */}
      <div className="border-b border-warm-gray">
        <PriorityIntelligence onSelect={setSelectedPost} />
      </div>

      {/* Facts Grid */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {FUN_FACTS.map((fact) => {
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
