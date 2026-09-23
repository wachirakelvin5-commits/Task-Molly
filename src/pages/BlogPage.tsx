import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BLOG_POSTS, BlogPost } from '../constants/blogData';
import ForumSidebar from '../components/ForumSidebar';
import { Clock, Calendar, ChevronLeft, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BlogPage() {
  const [selectedPost, setSelectedPost] = useState<BlogPost>(BLOG_POSTS[0]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0d0d0d] overflow-hidden">
      {/* Column 1: Forum (Left) */}
      <div className="hidden xl:block w-[320px] h-full border-r border-white/5 flex-shrink-0">
        <ForumSidebar />
      </div>

      {/* Column 2: Article Content (Center) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a]">
        {/* Sub-header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.4em] text-accent-gold font-bold">Insight Engine v1.0</span>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[11px] text-white/40 font-mono tracking-tight truncate max-w-[300px]">
              DATA_FEED: {selectedPost.title.toUpperCase().replace(/ /g, '_')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 px-2 py-0.5">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] uppercase tracking-wider text-green-500 font-bold">Encrypted</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-12">
          <motion.div
            key={selectedPost.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-8">
                <span className="px-3 py-1 bg-accent-gold/10 text-accent-gold text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm border border-accent-gold/20">
                  {selectedPost.category}
                </span>
                <div className="flex items-center gap-4 text-[10px] text-white/30 uppercase tracking-widest font-mono">
                  <span>{selectedPost.date}</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>

              <h1 className="text-4xl lg:text-6xl font-light text-white mb-10 leading-[1.1] tracking-tighter">
                {selectedPost.title}
              </h1>

              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group">
                <img 
                  src={selectedPost.image} 
                  alt={selectedPost.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rich-black/60 to-transparent" />
              </div>
            </div>

            <div className="prose prose-invert prose-lg max-w-none prose-p:text-white/50 prose-p:font-light prose-headings:font-light prose-headings:tracking-tight prose-a:text-accent-gold prose-strong:text-white prose-blockquote:border-accent-gold prose-blockquote:bg-white/2">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-light mt-16 mb-8" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-light mt-12 mb-6" {...props} />,
                  p: ({node, ...props}) => <p className="mb-8 leading-relaxed" {...props} />,
                }}
              >
                {selectedPost.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Column 3: Article List (Right) */}
      <div className="hidden lg:flex w-80 xl:w-96 border-l border-white/5 flex-col bg-[#0d0d0d]">
        <div className="p-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Article Archive</span>
          <div className="flex items-center gap-1">
             <div className="w-1 h-1 rounded-full bg-accent-gold" />
             <span className="text-[10px] font-mono text-accent-gold/60">{BLOG_POSTS.length}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {BLOG_POSTS.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={`w-full p-4 text-left group transition-all border-b border-white/[0.03] space-y-3 ${
                selectedPost.id === post.id ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'
              }`}
            >
              <div className="aspect-[16/9] rounded-lg overflow-hidden border border-white/10 relative">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    selectedPost.id === post.id ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'
                  }`}
                />
                {selectedPost.id === post.id && (
                  <div className="absolute inset-0 border-2 border-accent-gold/50 rounded-lg" />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] uppercase tracking-widest text-accent-gold font-bold">
                    {post.category}
                  </span>
                  <span className="text-[8px] font-mono text-white/20">{post.date}</span>
                </div>
                <h4 className={`text-xs font-medium leading-tight transition-colors ${
                  selectedPost.id === post.id ? 'text-white' : 'text-white/40 group-hover:text-white'
                }`}>
                  {post.title}
                </h4>
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">
              <span>Terminal Status</span>
              <span className="text-green-500">Online</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 animate={{ x: ['-100%', '100%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                 className="h-full w-1/3 bg-accent-gold/20" 
               />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay logic */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button 
          className="w-12 h-12 rounded-full bg-accent-gold text-white shadow-2xl flex items-center justify-center"
          onClick={() => {}}
        >
          <MessageCircle size={20} />
        </button>
      </div>
    </div>
  );
}

