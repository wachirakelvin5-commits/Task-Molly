import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram,
  Users,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const FOUNDERS = [
  {
    name: 'Moh',
    role: 'CEO',
    title: 'VISIONARY LEAD',
    email: 'mauriemwas@gmail.com',
    description: 'The heartbeat of our vision, driving the long-term strategy for a more organized Kenya.'
  },
  {
    name: 'Watty',
    role: 'CTO',
    title: 'DIGITAL ARCHITECT',
    email: 'stephenwatsonwambugu@gmail.com',
    description: 'The structural genius behind the code that makes booking a pro as easy as sending a text.'
  },
  {
    name: 'Kevv',
    role: 'COO',
    title: 'CULTURE CURATOR',
    email: 'wachira5kelvin@gmail.com',
    description: 'Ensuring every interaction with Task Molly feels like home, bridging the gap between tech and people.'
  }
];

export default function AboutView() {
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);

  return (
    <div className="h-full bg-[#D1C7BD] overflow-y-auto px-2 md:px-6 py-4 md:py-12 flex flex-col items-center no-scrollbar">
      {/* Brand Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 w-full max-w-md"
      >
        <div 
          onClick={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
          className="bg-black p-8 rounded-[2.5rem] shadow-xl text-left cursor-pointer hover:scale-[1.01] transition-transform"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-white text-lg leading-relaxed font-semibold pr-4">
              Our Story
            </p>
            {isNarrativeExpanded ? (
              <ChevronUp className="text-white shrink-0" size={24} />
            ) : (
              <ChevronDown className="text-white shrink-0" size={24} />
            )}
          </div>

          <div className="text-white/90 text-sm leading-relaxed font-medium space-y-4">
            {!isNarrativeExpanded ? (
              <p className="text-base font-black text-white">
                Life in Nairobi doesn't pause. Your tasks don't have to stress you. Task Molly... we sort it, so you get to live it up!
              </p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="full-story"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p>
                    Nairobi life doesn't slow down. Between the morning rush, the endless meetings, and the hustle that never really stops, it's easy to let the small things pile up...
                  </p>
                  <p>
                    That leaking sink. The mountain of laundry. The deep clean you keep postponing.
                  </p>
                  <p className="font-bold text-white">We get it. Because we live it too.</p>
                  <p>
                    At Task Molly, we've built a platform that takes the weight off your shoulders... so you can focus on what actually matters. Life in Nairobi doesn't pause. Your tasks don't have to stress you. Task Molly... we sort it, so you get to live it up!
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>

      {/* Founders Section */}
      <section className="w-full max-w-lg mb-20">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-[2px] flex-1 bg-black/20" />
          <h2 className="text-black font-black uppercase tracking-[0.4em] text-xs">Founding Gang</h2>
          <div className="h-[2px] flex-1 bg-black/20" />
        </div>

        <div className="space-y-6">
          {FOUNDERS.map((founder, i) => (
            <motion.div 
              key={founder.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-black/5 hover:border-[#FF991C] transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <a 
                    href={`mailto:${founder.email}`}
                    className="text-3xl font-black text-black block hover:text-[#FF991C] transition-colors"
                  >
                    {founder.name}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-[#FF991C]">{founder.role}</span>
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{founder.title}</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-accent-gold">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-black/70 text-sm leading-relaxed font-medium">
                {founder.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-[#FF991C] uppercase tracking-widest">
                <Mail size={12} />
                {founder.email}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Links */}
      <section className="flex flex-col items-center gap-8 mb-12">
        <h3 className="text-black font-black uppercase tracking-[0.4em] text-xs">Join the movement</h3>
        <div className="flex gap-6">
          <a 
            href="https://whatsapp.com/channel/0029Vb7aTZXGOj9jTqXvKc2P" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 bg-black flex items-center justify-center rounded-full text-white hover:scale-110 transition-transform shadow-xl border-4 border-[#FF991C]"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <a 
            href="https://www.instagram.com/taskmolly254?utm_source=qr&igsh=N2FkdGM3ejd0MGl1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-16 h-16 bg-black flex items-center justify-center rounded-full text-white hover:scale-110 transition-transform shadow-xl border-4 border-[#FF991C]"
          >
            <Instagram size={32} />
          </a>
          <a 
            href="mailto:support.taskmolly254@gmail.com" 
            className="w-16 h-16 bg-black flex items-center justify-center rounded-full text-white hover:scale-110 transition-transform shadow-xl border-4 border-[#FF991C]"
          >
            <Mail size={32} />
          </a>
        </div>
      </section>

      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40 mt-auto">
        © 2026 TASK MOLLY KENYA LIMITED
      </p>
    </div>
  );
}
