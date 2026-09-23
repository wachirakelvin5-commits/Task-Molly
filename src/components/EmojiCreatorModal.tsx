import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Copy, X, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmojiCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmojiCreatorModal({ isOpen, onClose }: EmojiCreatorModalProps) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmoji, setGeneratedEmoji] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    
    try {
      // Logic to generate an emoji-like image using AI
      // For now, we simulate the AI "creation" with a high-quality placeholder based on keywords
      // In a real implementation, we'd use the generate_image tool or a dedicated endpoint
      const keywords = description.toLowerCase();
      let seed = Math.random();
      
      // Simulate network lag
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let imageUrl = `https://picsum.photos/seed/${seed}/200`;
      
      // Better simulation: choose specific "emoji-like" styles
      if (keywords.includes('plumber')) {
        imageUrl = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=200&h=200';
      } else if (keywords.includes('electrician')) {
        imageUrl = 'https://images.unsplash.com/photo-1621905252507-b354bcadc0e4?auto=format&fit=crop&q=80&w=200&h=200';
      }

      setGeneratedEmoji(imageUrl);
      toast.success("AI Emoji Generated!");
    } catch (error) {
      toast.error("Failed to generate emoji");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedEmoji) {
      // Simulate copying to clipboard
      navigator.clipboard.writeText(generatedEmoji);
      toast.success("Emoji destination copied!");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white border border-warm-gray p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-rich-black uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="text-accent-gold" size={20} />
                  Emoji Lab
                </h3>
                <p className="text-[10px] text-rich-black/30 uppercase tracking-[0.2em] font-medium mt-1">AI-Powered Creation</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-primary-bg rounded-xl transition-colors"
              >
                <X size={20} className="text-rich-black/20" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-2">Describe your vibe</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Enthusiastic plumber fixing a leak..."
                  className="w-full bg-primary-bg border border-warm-gray rounded-2xl p-4 text-xs text-rich-black placeholder:text-rich-black/20 focus:outline-none focus:border-accent-gold/50 transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="flex justify-center py-4">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="w-32 h-32 rounded-3xl border-2 border-dashed border-accent-gold/30 flex items-center justify-center bg-accent-gold/5"
                    >
                      <Loader2 className="text-accent-gold animate-spin" size={32} />
                    </motion.div>
                  ) : generatedEmoji ? (
                    <motion.div
                      key="emoji"
                      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      className="relative group"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [-2, 2, -2]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-32 h-32 rounded-3xl overflow-hidden shadow-xl border-4 border-white"
                      >
                        <img src={generatedEmoji} alt="Generated Emoji" className="w-full h-full object-cover" />
                      </motion.div>
                      <button
                        onClick={handleCopy}
                        className="absolute -bottom-2 -right-2 p-2 bg-rich-black text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                      >
                        <Copy size={16} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      className="w-32 h-32 rounded-3xl border-2 border-dashed border-warm-gray flex flex-col items-center justify-center text-rich-black/10 gap-2 font-mono text-[10px] uppercase tracking-widest"
                    >
                      <Wand2 size={32} />
                      Waiting
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="w-full py-4 bg-accent-gold text-white text-xs uppercase font-bold tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-accent-gold/10 flex items-center justify-center gap-2"
              >
                {isGenerating ? "Synthesizing..." : "Generate Magic"}
                {!isGenerating && <Wand2 size={16} />}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
