import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Delay showing the prompt slightly to not annoy the user immediately
      const dismissalTime = localStorage.getItem('pwa_prompt_dismissed');
      const isExpired = dismissalTime && Date.now() - parseInt(dismissalTime) > 7 * 24 * 60 * 60 * 1000;
      
      if (!dismissalTime || isExpired) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it's iOS, we show the instructions manually since there's no native prompt
    if (isIOSDevice && !isStandalone) {
      const dismissalTime = localStorage.getItem('pwa_prompt_dismissed');
      const isExpired = dismissalTime && Date.now() - parseInt(dismissalTime) > 7 * 24 * 60 * 60 * 1000;
      
      if (!dismissalTime || isExpired) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[200] max-w-md mx-auto"
      >
        <div className="bg-black border-2 border-[#AE9573] rounded-3xl p-5 shadow-2xl overflow-hidden relative">
          <button 
            onClick={dismissPrompt}
            className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#AE9573] rounded-xl flex items-center justify-center text-black shrink-0 shadow-lg">
              <Download size={24} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-white font-black text-sm uppercase tracking-tight">Install Task Molly</h3>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                Add to your home screen for a premium, faster experience.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {isIOS ? (
              <div className="bg-white/5 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white text-xs">
                  <span className="flex items-center justify-center w-5 h-5 bg-[#AE9573] rounded-full text-black font-bold text-[10px]">1</span>
                  <span>Tap the <span className="inline-flex items-center bg-white/10 px-1 rounded mx-0.5"><Share size={12} className="text-blue-400" /></span> icon below</span>
                </div>
                <div className="flex items-center gap-2 text-white text-xs">
                  <span className="flex items-center justify-center w-5 h-5 bg-[#AE9573] rounded-full text-black font-bold text-[10px]">2</span>
                  <span>Scroll down and select <span className="font-bold flex items-center gap-1">Add to Home Screen <PlusSquare size={12} /></span></span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-[#AE9573] text-black font-black py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                INSTALL APP
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
