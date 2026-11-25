import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PenLine, LogIn, LayoutDashboard, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';


import { useDeviceType } from '../hooks/useDeviceType';

interface NavbarProps {
  user: UserProfile | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen]);

  const dashboardPath = user?.role === 'tasker' ? '/provider-dashboard' : '/dashboard';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-primary-bg/80 backdrop-blur-md border-b border-warm-gray items-center ${
      isPhone ? 'flex justify-between px-4 py-3' : 'grid grid-cols-3 px-6 py-4'
    }`}>
      <div className="flex items-center">
        {/* Hand holding pen icon dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center p-2 hover:bg-warm-gray/10 rounded-lg transition-colors group text-accent-gold"
            aria-label="Services Menu"
          >
            <PenLine size={28} className="transform rotate-[-15deg]" />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-60 bg-white border border-warm-gray rounded-2xl shadow-xl overflow-hidden py-2"
              >
                {/* Opens the Premium packages page in a new tab */}
                <a
                  href="/premium"
                  target="_blank"
                  rel="noopener"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full px-5 py-3 text-sm font-semibold text-rich-black hover:bg-warm-gray/10 hover:text-accent-gold transition-colors flex items-center justify-between gap-3 group"
                >
                  <span>task-molly providers</span>
                  <ExternalLink size={14} className="text-accent-gold shrink-0" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center">
        <Link to="/" className="flex items-baseline group" aria-label="task-molly home">
          <span className={`text-rich-black font-semibold tracking-tight transition-all ${
            isPhone ? 'text-xl' : 'text-2xl'
          }`}>task-</span>
          <span className={`text-accent-gold font-light tracking-tight transition-all ${
            isPhone ? 'text-xl' : 'text-2xl'
          }`}>molly</span>
        </Link>
      </div>

      <div className="flex justify-end items-center gap-4">
        {user ? (
          <Link 
            to={dashboardPath} 
            className="flex items-center gap-2 p-2 text-rich-black hover:text-accent-gold transition-colors"
            title="Dashboard"
          >
            <LayoutDashboard size={24} />
            <span className="hidden md:block text-sm font-medium">Dashboard</span>
          </Link>
        ) : (
          <div className="flex flex-col gap-1 items-end">
            <Link 
              to="/auth?role=client" 
              className="px-4 py-1.5 bg-accent-gold hover:bg-accent-gold/90 text-white font-bold text-[10px] uppercase tracking-widest rounded-full transition-all text-center w-24 shadow-sm shadow-accent-gold/10 hover:shadow-md hover:shadow-accent-gold/20"
              title="Client Login"
            >
              Client
            </Link>
            <Link 
              to="/auth?role=tasker" 
              className="px-4 py-1.5 bg-accent-gold hover:bg-accent-gold/90 text-white font-bold text-[10px] uppercase tracking-widest rounded-full transition-all text-center w-24 shadow-sm shadow-accent-gold/10 hover:shadow-md hover:shadow-accent-gold/20"
              title="Provider Login"
            >
              Provider
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
