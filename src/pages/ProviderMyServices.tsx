import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, ServiceVerification } from '../types';
import { ALL_SERVICES_CATALOG, ServiceItem, getCatalogServiceCategory } from '../data/serviceCatalog';
import { getProviderVerifications } from '../lib/verificationService';
import ServiceActivationModal from '../components/ServiceActivationModal';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface ProviderMyServicesProps {
  user: UserProfile;
}

export default function ProviderMyServices({ user }: ProviderMyServicesProps) {
  const navigate = useNavigate();

  // Redirect client users to client dashboard
  useEffect(() => {
    if (user.role === 'client') {
      navigate('/dashboard', { replace: true });
    }
  }, [user.role, navigate]);

  const [verifications, setVerifications] = useState<Record<string, ServiceVerification>>({});
  const [activeServiceForModal, setActiveServiceForModal] = useState<ServiceItem | null>(null);

  // Load and subscribe to verifications
  const loadVerifications = async () => {
    if (!user.uid) return;
    const data = await getProviderVerifications(user.uid);
    setVerifications(data);
  };

  useEffect(() => {
    loadVerifications();
  }, [user.uid]);

  // Real-time listener for user profile updates in Firestore
  useEffect(() => {
    if (!user.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.serviceVerifications) {
          setVerifications(prev => ({ ...prev, ...data.serviceVerifications }));
        }
      }
    }, (err) => {
      console.warn("Could not listen to user verifications:", err);
    });

    return () => unsub();
  }, [user.uid]);

  return (
    <div className="min-h-[100dvh] bg-primary-bg flex flex-col justify-between pt-6 pb-8 px-3 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto w-full space-y-6 flex-1">
        
        {/* Header: Categories */}
        <div className="pb-3 border-b border-warm-gray/60">
          <h1 className="text-2xl sm:text-3xl font-black text-rich-black tracking-tight">
            Categories
          </h1>
        </div>

        {/* SERVICES CATEGORIES PLACARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {ALL_SERVICES_CATALOG.map((service, index) => {
            const Icon = service.IconComponent;
            const verification = verifications[service.id];
            const isVerified = verification?.status === 'verified';
            const isPending = verification?.status === 'pending';
            const categoryName = getCatalogServiceCategory(service) || 'General';

            return (
              <motion.button
                key={service.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.2) }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveServiceForModal(service)}
                className={`relative p-3.5 sm:p-4 rounded-3xl border-2 text-center flex flex-col items-center justify-between transition-all cursor-pointer min-h-[170px] sm:min-h-[190px] ${
                  isVerified
                    ? 'bg-white border-emerald-500 shadow-md shadow-emerald-500/10'
                    : isPending
                      ? 'bg-white border-amber-400 shadow-md shadow-amber-400/10'
                      : 'bg-white border-warm-gray hover:border-accent-gold shadow-2xs hover:shadow-md'
                }`}
              >
                {/* Status Indicator Badge */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-rich-black/40 truncate max-w-[90px]">
                    {categoryName.split(' ')[0]}
                  </span>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  ) : isPending ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full shrink-0">
                      <Clock size={10} /> Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded-full shrink-0">
                      <Plus size={10} /> Activate
                    </span>
                  )}
                </div>

                {/* Line art Icon Component */}
                <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center my-1.5 transition-transform group-hover:scale-105 shrink-0">
                  <Icon size={52} className={isVerified ? 'text-emerald-700' : isPending ? 'text-amber-700' : 'text-rich-black'} />
                </div>

                {/* Service Name */}
                <div className="w-full mt-auto">
                  <h3 className="text-xs sm:text-sm font-bold text-rich-black tracking-tight leading-snug line-clamp-2">
                    {service.name}
                  </h3>
                  <p className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${
                    isVerified ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-rich-black/40'
                  }`}>
                    {isVerified ? 'Verified Pro' : isPending ? 'Documents in review' : 'Tap to upload docs'}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom Left Back Button */}
        <div className="pt-6 pb-2 flex items-center justify-start">
          <button
            type="button"
            onClick={() => navigate('/provider-dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-warm-gray hover:border-accent-gold text-rich-black/80 hover:text-rich-black rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer group"
          >
            <ArrowLeft size={16} className="text-rich-black/50 group-hover:text-accent-gold transition-colors" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Service Activation & Document Upload Modal */}
      {activeServiceForModal && (
        <ServiceActivationModal
          isOpen={Boolean(activeServiceForModal)}
          onClose={() => setActiveServiceForModal(null)}
          service={activeServiceForModal}
          currentVerification={verifications[activeServiceForModal.id]}
          allVerifications={verifications}
          user={user}
          onVerificationSaved={() => {
            loadVerifications();
          }}
        />
      )}
    </div>
  );
}
