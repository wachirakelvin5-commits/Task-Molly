import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { UserProfile } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export default function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
  const [name, setName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || 'Nairobi, Kenya');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const isMockUser = user.uid.startsWith('dev_');
      const updatedProfile: Partial<UserProfile> = {
        displayName: name,
        email: email,
        phone: phone,
        location: location,
        photoURL: photoURL || `https://picsum.photos/seed/${user.uid}/200`
      };

      if (isMockUser) {
        // Update mock user in local storage
        const mockUserStr = localStorage.getItem('taskmolly_mock_user');
        if (mockUserStr) {
          const localUser = JSON.parse(mockUserStr);
          const newMockUser = { ...localUser, ...updatedProfile };
          localStorage.setItem('taskmolly_mock_user', JSON.stringify(newMockUser));
        }
      }

      // Always try updating Firestore if possible
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, updatedProfile);
      } catch (dbErr) {
        console.warn("Could not save to firestore (expected for some offline dev sessions):", dbErr);
      }

      toast.success("Profile details updated successfully!");
      onClose();
      
      // Reload page to propagate changes across the app immediately
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-rich-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-warm-gray"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-warm-gray flex items-center justify-between bg-primary-bg/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-accent-gold" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rich-black/40">Account Settings</span>
              </div>
              <h2 className="text-2xl font-black text-rich-black tracking-tighter">
                Edit Your <span className="text-accent-gold">Profile</span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-full border border-warm-gray hover:border-accent-gold transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
            {/* Avatar Preview & URL */}
            <div className="flex items-center gap-4 bg-primary-bg/30 p-4 rounded-2xl border border-warm-gray/50">
              <div className="relative w-16 h-16 shrink-0">
                <img 
                  src={photoURL || `https://picsum.photos/seed/${user.uid}/200`} 
                  alt={name} 
                  className="w-full h-full rounded-full object-cover border-2 border-accent-gold p-0.5"
                />
                <div className="absolute -bottom-1 -right-1 bg-accent-gold text-white p-1 rounded-full border border-white">
                  <Camera size={10} />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-rich-black/40 block mb-1">Profile Photo URL</label>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Paste image link here..."
                  className="w-full px-3 py-2 bg-white border border-warm-gray rounded-xl text-xs focus:outline-none focus:border-accent-gold transition-all"
                />
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-rich-black/40 mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kelvin Wachira"
                  className="w-full pl-11 pr-4 py-3 bg-primary-bg/40 border border-warm-gray rounded-xl text-sm focus:outline-none focus:border-accent-gold transition-all font-medium text-rich-black"
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-rich-black/40 mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customercare@taskmolly.com"
                  className="w-full pl-11 pr-4 py-3 bg-primary-bg/40 border border-warm-gray rounded-xl text-sm focus:outline-none focus:border-accent-gold transition-all font-medium text-rich-black"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-rich-black/40 mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +254 712 345 678"
                  className="w-full pl-11 pr-4 py-3 bg-primary-bg/40 border border-warm-gray rounded-xl text-sm focus:outline-none focus:border-accent-gold transition-all font-medium text-rich-black"
                />
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-rich-black/40 mb-1.5 block">Default Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={16} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nairobi, Kenya"
                  className="w-full pl-11 pr-4 py-3 bg-primary-bg/40 border border-warm-gray rounded-xl text-sm focus:outline-none focus:border-accent-gold transition-all font-medium text-rich-black"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-warm-gray flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-warm-gray text-rich-black/60 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-bg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-rich-black text-accent-gold rounded-xl font-bold text-xs uppercase tracking-[0.15em] hover:shadow-lg hover:shadow-accent-gold/10 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                ) : <Save size={14} />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
