import { motion } from 'motion/react';
import { Mail, MessageCircle, Clock, MapPin, MessageSquare, ExternalLink } from 'lucide-react';

import { useDeviceType } from '../hooks/useDeviceType';

export default function ContactView() {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const handleHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      value: 'support.taskmolly254@gmail.com',
      action: 'mailto:support.taskmolly254@gmail.com',
      label: 'Send an email'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp Us',
      value: '0706220959',
      action: 'https://wa.me/254706220959',
      label: 'Chat on WhatsApp'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      value: '9:00 AM - 9:00 PM',
      subValue: 'Every day (Except Holidays)',
      label: 'Open Daily'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-primary-bg/30 overflow-y-auto no-scrollbar">
      {/* Header */}
      <section className={`${isPhone ? 'p-6' : 'p-8 md:p-12'} text-center bg-white border-b border-warm-gray`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-light mb-4">
            We are here to <span className="text-accent-gold font-medium">help!</span>
          </h1>
          <p className="text-rich-black/60 max-w-md mx-auto leading-relaxed">
            Have a question or need assistance? Our support team is ready to assist you every day of the week.
          </p>
        </motion.div>
      </section>

      {/* Contact Cards */}
      <section className={`${isPhone ? 'p-4' : 'p-6 md:p-12'} grid grid-cols-1 gap-4 max-w-2xl mx-auto w-full`}>
        {contactMethods.map((method, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-warm-gray shadow-sm hover:border-accent-gold transition-all group"
          >
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center text-accent-gold shrink-0 group-hover:bg-accent-gold group-hover:text-white transition-all">
                <method.icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-rich-black/40 mb-1">{method.title}</h3>
                <div className="text-base md:text-lg font-medium text-rich-black mb-1 break-all md:break-words">{method.value}</div>
                {method.subValue && <div className="text-sm text-rich-black/60">{method.subValue}</div>}
                
                {method.action && (
                  <button
                    onClick={() => { handleHaptic(); window.location.href = method.action!; }}
                    className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-gold hover:gap-3 transition-all"
                  >
                    {method.label} <ExternalLink size={14} />
                  </button>
                )}
                {!method.action && (
                  <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                    {method.label}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Quick Support Section */}
      <section className={`${isPhone ? 'p-6 mx-4' : 'p-8 md:p-12 mx-6 md:mx-12'} bg-rich-black text-white text-center rounded-[3rem] mb-12`}>
        <MessageSquare className="mx-auto mb-6 text-accent-gold" size={isPhone ? 32 : 40} />
        <h2 className="text-2xl font-light mb-4">Need instant answers?</h2>
        <p className="text-white/60 text-sm mb-8 max-w-sm mx-auto">
          Try our concierge service for quick booking and service inquiries.
        </p>
        <button 
          onClick={() => { handleHaptic(); window.location.href = '/chat'; }}
          className="bg-accent-gold text-rich-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-accent-gold/20"
        >
          Open Live Chat
        </button>
      </section>

      {/* Footer Info */}
      <footer className="p-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-rich-black/30">
        📍 Serving Nairobi, Kisumu, Mombasa & Eldoret
      </footer>
    </div>
  );
}
