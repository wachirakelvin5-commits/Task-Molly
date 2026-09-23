import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SCENES = [
  {
    id: 'washing-machine',
    url: 'https://images.unsplash.com/photo-1622473590925-e3616c0a41bf?q=80&w=992&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'washing-machine'
  },
  {
    id: 'meal-prepping',
    url: 'https://images.unsplash.com/photo-1543352632-5a4b24e4d2a6?q=80&w=1925&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Prepped meal portions'
  },
  {
    id: 'cleaning-hand',
    url: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'cleaning hand'
  },
  {
    id: 'daily-planner',
    url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2668&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Personal assistant planner'
  },
  {
    id: 'home-cleaning',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Professional cleaner at work'
  },
  {
    id: 'grocery-shopping-bagged',
    url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Grocery shopping bagged'
  },
  {
    id: 'delivery-bike',
    url: 'https://images.unsplash.com/photo-1572182290288-26ffb0e10308?q=80&w=2532&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Delivery bike at the door'
  },
  {
    id: 'barber-shop',
    url: 'https://images.unsplash.com/photo-1635273051427-7c2a35ce50ce?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Image of a barber shop tools'
  },
  {
    id: 'electric-fixing',
    url: 'https://images.unsplash.com/photo-1665242043190-0ef29390d289?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Electrician working on home fixtures'
  },
  {
    id: 'delivery-man',
    url: 'https://images.unsplash.com/photo-1656608518419-5a90405aa5cd?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Man on delivery bike'
  },
];

export default function HeroVideo() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SCENES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-warm-gray/10">
      <AnimatePresence>
        <motion.div
          key={SCENES[currentIndex].id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={SCENES[currentIndex].url}
            alt={SCENES[currentIndex].alt}
            className="w-full h-full object-cover scale-105"
            referrerPolicy="no-referrer"
          />
          {/* Subtle overlay for contrast without heavy shadowing */}
          <div className="absolute inset-0 bg-white/10"></div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white"></div>
    </div>
  );
}
