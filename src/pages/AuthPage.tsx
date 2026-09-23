import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, UserProfile } from '../types';
import { Phone, Mail, ArrowRight, CheckCircle2, Beaker, User, Briefcase, ChevronLeft, Lock, UserPlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

type AuthStep = 'role-selection' | 'method-selection' | 'phone-input' | 'otp-input' | 'email-input' | 'password-input' | 'registration-confirm' | 'profile-setup' | 'manual-login';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<AuthStep>('role-selection');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const redirectPath = queryParams.get('redirect');
    const roleParam = queryParams.get('role');
    
    if (roleParam === 'client') {
      setSelectedRole('client');
      setStep('method-selection');
    } else if (roleParam === 'tasker' || roleParam === 'provider') {
      setSelectedRole('tasker');
      setStep('method-selection');
    } else if (redirectPath === 'pending-task') {
      setSelectedRole('client');
      setStep('method-selection');
    }
  }, [location.search]);

  useEffect(() => {
    if (step === 'phone-input' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }, [step]);

  const finalizePendingRequest = async (uid: string, displayName: string) => {
    const pendingData = sessionStorage.getItem('pending_service_request');
    if (pendingData) {
      console.log(`[Auth Sync Log] 🔍 Data detected for ${displayName} (UID: ${uid}). Preparing sync...`);
      try {
        const request = JSON.parse(pendingData);
        const payload = {
          clientId: uid,
          clientName: displayName || 'Client',
          ...request
        };

        console.log("[Auth Sync Log] 🚀 Sending Concierge Request to API:", request.syncId || 'no-id');
        toast.info("Finalizing your concierge request...", { id: 'auth-sync' });
        
        const res = await fetch('/api/service-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const resData = await res.json().catch(() => ({}));
        
        if (res.ok) {
          console.log("[Auth Sync Log] ✅ Sync SUCCESS! ID:", resData.id);
          sessionStorage.removeItem('pending_service_request');
          toast.success("Request created! Redirecting...", { id: 'auth-sync' });
          
          // Give a delay for Firestore propagation
          await new Promise(resolve => setTimeout(resolve, 1500));
          return true;
        } else {
          console.error("[Auth Sync Log] ❌ Sync failed:", resData);
          if (res.status === 400 || res.status === 409) {
            sessionStorage.removeItem('pending_service_request');
          }
          toast.error("Could not sync your request automatically.", { id: 'auth-sync' });
          return false;
        }
      } catch (err) {
        console.error("[Auth Sync Log] ❌ Exception:", err);
        return false;
      }
    }
    return true;
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      authInfo: {
        userId: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
      },
      operation,
      path
    };
    console.error(`[Firestore Error] ${operation} on ${path}:`, JSON.stringify(errInfo));
    toast.error(`Permissions error: ${error.message || 'Operation failed'}`);
  };

  const handleUserCreation = async (user: any, role: UserRole, providedName?: string) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef).catch(err => {
        handleFirestoreError(err, 'GET_USER', `users/${user.uid}`);
        return null;
      });

      if (userDoc && !userDoc.exists()) {
        const userData: UserProfile = {
          uid: user.uid,
          email: user.email || email || '',
          phone: user.phoneNumber || phoneNumber || '',
          role: role,
          displayName: providedName || user.displayName || `User_${user.uid.slice(0, 5)}`,
          photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
          isVerified: true,
          createdAt: new Date().toISOString(),
        };

        if (role === 'tasker') {
          userData.walletBalance = 4500;
        }

        await setDoc(userDocRef, userData).catch(err => {
          handleFirestoreError(err, 'CREATE_USER', `users/${user.uid}`);
        });
        toast.success(`Account created as ${role === 'tasker' ? 'Service Provider' : 'Client'}`);
      }

      // Check for pending AI request
      await finalizePendingRequest(user.uid, providedName || user.displayName || userDoc?.data()?.displayName);

      // Final redirection based on role or redirect parameter
      const queryParams = new URLSearchParams(window.location.search);
      const redirectPath = queryParams.get('redirect');
      
      if (redirectPath === 'pending-task') {
        window.location.href = '/dashboard';
        return;
      }
      
      if (redirectPath && redirectPath.startsWith('/')) {
        window.location.href = redirectPath;
        return;
      }

      const finalRole = userDoc.exists() ? userDoc.data().role : role;
      if (finalRole === 'tasker') {
        window.location.href = '/provider-dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error("User creation error:", err);
      toast.error("Failed to finalize account setup");
    }
  };

  const checkUserExists = async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  };

  const handleEmailNext = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setStep('password-input');
      } else {
        setStep('registration-confirm');
      }
    } catch (err: any) {
      toast.error("Error checking email");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleUserCreation(result.user, selectedRole!);
    } catch (err: any) {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    if (!selectedRole) return;
    setStep('profile-setup');
  };

  const handleProfileComplete = async () => {
    if (!displayName) {
      toast.error("Please enter your name");
      return;
    }
    
    setLoading(true);
    try {
      let user = tempUser;
      
      // If registering with email, create the auth account now
      if (!user && email) {
        if (!password || password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
      }
      
      if (user) {
        await handleUserCreation(user, selectedRole!, displayName);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      toast.error("Registration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminBypass = () => {
    setLoading(true);
    const mockAdmin: UserProfile = {
      uid: 'admin_bypass',
      email: 'wachirakelvin5@gmail.com', // Using user's email which is already treated as admin in App.tsx
      displayName: 'System Administrator',
      role: 'admin' as any,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem('taskmolly_mock_user', JSON.stringify(mockAdmin));
    toast.success("Admin Bypass Successful");
    window.location.href = '/admin-dashboard';
  };

  const handleDeveloperLogin = async (roleOverride?: UserRole) => {
    const role = roleOverride || selectedRole;
    console.log("Starting Developer Login for role:", role);
    if (!role) {
      toast.error("Please select a role first");
      return;
    }
    
    setLoading(true);
    try {
      // Use a more stable ID for testing persistence across sessions
      const mockId = `dev_${role}_stable`;
      console.log("Using stable mockId:", mockId);
      
      const mockUser: UserProfile = {
        uid: mockId,
        email: email || `dev_${role}@taskmolly.test`,
        displayName: displayName || `Dev ${role === 'tasker' ? 'Pro' : 'Client'}`,
        photoURL: `https://picsum.photos/seed/${mockId}/200`,
        role: role,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      if (role === 'tasker') {
        mockUser.walletBalance = 4500;
        mockUser.services = ['Mama Fua', 'Plumbing', 'Electrician', 'Gardener'];
      }

      console.log("Saving mock user to localStorage...");
      localStorage.setItem('taskmolly_mock_user', JSON.stringify(mockUser));
      
      const targetPath = role === 'tasker' ? '/provider-dashboard' : '/dashboard';
      
      // Attempt Firestore write
      console.log("Attempting to save mock user to Firestore...");
      setLoading(true);
      try {
        await Promise.race([
          setDoc(doc(db, 'users', mockId), mockUser),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore Write Timeout")), 5000))
        ]);
        console.log("Firestore write successful for mock user");
      } catch (fErr) {
        console.warn("Firestore write for dev session failed/timed out (proceeding with local session):", fErr);
      }
      
      // Finalize any pending AI concierge requests before redirecting
      console.log("[Auth] Checking for pending service requests in session storage storage...");
      const pendingData = sessionStorage.getItem('pending_service_request');
      if (pendingData) {
        console.log("[Auth] Data found. Triggering sync for UID:", mockId);
        await finalizePendingRequest(mockId, mockUser.displayName || `Dev ${role === 'tasker' ? 'Pro' : 'Client'}`);
        // Significant delay to ensure Firestore propagation before dashboard fetch
        console.log("[Auth] Sync complete. Waiting for propagation...");
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        console.log("[Auth] No pending data found in session storage.");
      }
      
      toast.success("Developer Login Successful", { id: 'dev-login-toast' });
      
      const queryParams = new URLSearchParams(window.location.search);
      const redirectPath = queryParams.get('redirect');
      
      let finalTarget = targetPath;
      if (redirectPath === 'pending-task') {
        finalTarget = '/dashboard';
      } else if (redirectPath && redirectPath.startsWith('/')) {
        finalTarget = redirectPath;
      }
      
      console.log("[Auth] finalTarget for redirect:", finalTarget);
      
      // Redirect
      window.location.href = finalTarget;
      
    } catch (err: any) {
      console.error("Dev login critical error:", err);
      toast.error("Developer login failed: " + (err.message || "Unknown error"));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!selectedRole) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleUserCreation(result.user, selectedRole);
    } catch (err: any) {
      setError(err.message);
      toast.error("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      toast.error("Enter phone number");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp-input');
      toast.success("OTP Sent");
    } catch (err: any) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationCode || !confirmationResult || !selectedRole) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const exists = await checkUserExists(result.user.uid);
      if (exists) {
        await handleUserCreation(result.user, selectedRole);
      } else {
        setTempUser(result.user);
        setStep('registration-confirm');
      }
    } catch (err: any) {
      toast.error("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('method-selection');
  };

  const goBack = () => {
    if (step === 'method-selection') setStep('role-selection');
    if (step === 'phone-input') setStep('method-selection');
    if (step === 'email-input') setStep('method-selection');
    if (step === 'manual-login') setStep('method-selection');
    if (step === 'password-input') setStep('email-input');
    if (step === 'otp-input') setStep('phone-input');
    if (step === 'registration-confirm') {
      if (tempUser) {
        signOut(auth);
        setTempUser(null);
      }
      setStep('method-selection');
    }
    if (step === 'profile-setup') setStep('registration-confirm');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center py-24 px-4 md:px-6 bg-primary-bg relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-gold/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rich-black/5 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-delay:2s]" />
      
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: [0, -8, 0] 
        }}
        transition={{
          y: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          },
          opacity: { duration: 0.6 },
          scale: { duration: 0.6 }
        }}
        className="w-full max-w-xl bg-white/80 backdrop-blur-2xl p-8 md:p-14 rounded-[3rem] border border-warm-gray/50 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="monogram-m mx-auto mb-6 w-14 h-14 md:w-16 md:h-16 text-2xl flex items-center justify-center bg-accent-gold text-white rounded-2xl shadow-xl shadow-accent-gold/20"
          >
            M
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-light mb-3 tracking-tight">Task <span className="text-accent-gold">Molly</span></h2>
          <p className="text-rich-black/40 text-sm md:text-base font-medium">
            {step === 'role-selection' ? 'Choose how you want to use the platform' : 
             `Signing in as ${selectedRole === 'tasker' ? 'Service Provider' : 'Client'}`}
          </p>
        </div>

        {selectedRole === 'client' && window.location.search.includes('pending-task') && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-accent-gold/5 border border-accent-gold/20 p-5 rounded-[2rem] flex items-center gap-4">
              <div className="w-10 h-10 bg-accent-gold text-white rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <p className="text-xs text-rich-black/70 font-medium leading-relaxed">
                Finalize your <span className="text-accent-gold font-bold">concierge request</span>! Log in below. Dev Login is available for instant testing.
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {step === 'role-selection' && (
            <motion.div 
              key="role-selection-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3 md:space-y-4"
            >
              <button 
                onClick={() => selectRole('client')}
                className="w-full p-6 md:p-8 bg-primary-bg border border-warm-gray/50 rounded-[2rem] hover:border-accent-gold hover:shadow-lg hover:shadow-accent-gold/5 transition-all group text-left flex items-center gap-6"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 bg-white rounded-2xl flex items-center justify-center text-accent-gold shadow-sm group-hover:scale-110 transition-transform">
                  <User size={28} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h3 className="font-medium text-lg md:text-xl">I'm a Client</h3>
                  <p className="text-xs text-rich-black/40">I want to hire professionals</p>
                </div>
                <ArrowRight className="ml-auto text-warm-gray group-hover:text-accent-gold transition-all group-hover:translate-x-1" size={20} />
              </button>

              <button 
                onClick={() => selectRole('tasker')}
                className="w-full p-6 md:p-8 bg-rich-black border border-rich-black rounded-[2rem] hover:bg-rich-black/90 hover:shadow-lg hover:shadow-rich-black/20 transition-all group text-left flex items-center gap-6"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 bg-white/10 rounded-2xl flex items-center justify-center text-accent-gold shadow-sm group-hover:scale-110 transition-transform">
                  <Briefcase size={28} className="md:w-8 md:h-8" />
                </div>
                <div className="text-white">
                  <h3 className="font-medium text-lg md:text-xl">I'm a Provider</h3>
                  <p className="text-xs text-white/40">I want to offer my services</p>
                </div>
                <ArrowRight className="ml-auto text-white/20 group-hover:text-accent-gold transition-all group-hover:translate-x-1" size={20} />
              </button>

              <div className="pt-8 space-y-3">
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-warm-gray/50"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-bold text-rich-black/30"><span className="bg-white px-4 text-center leading-tight">Dev & Admin Entry</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => handleDeveloperLogin('client')}
                    className="flex flex-col items-center justify-center gap-1 p-4 bg-primary-bg border border-warm-gray rounded-2xl hover:border-accent-gold transition-all group"
                  >
                    <Beaker size={18} className="text-accent-gold group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rich-black/60">Dev Client</span>
                  </button>
                  <button 
                    onClick={() => handleDeveloperLogin('tasker')}
                    className="flex flex-col items-center justify-center gap-1 p-4 bg-primary-bg border border-warm-gray rounded-2xl hover:border-accent-gold transition-all group"
                  >
                    <Beaker size={18} className="text-accent-gold group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rich-black/60">Dev Provider</span>
                  </button>
                </div>

                <button 
                  onClick={handleAdminBypass}
                  className="w-full flex items-center justify-center gap-3 bg-accent-gold/5 border border-accent-gold/20 text-accent-gold py-4 rounded-2xl hover:bg-accent-gold/10 transition-all font-bold text-xs tracking-widest uppercase"
                >
                  <Lock size={16} />
                  Admin Dashboard Login
                </button>
              </div>
            </motion.div>
          )}

          {step === 'method-selection' && (
            <motion.div 
              key="method-selection-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors mb-4"
              >
                <ChevronLeft size={14} /> Back to roles
              </button>

              <div className="grid grid-cols-1 gap-4">
                 <button 
                  onClick={() => handleDeveloperLogin()}
                  className="w-full flex items-center justify-between p-6 bg-rich-black text-white border border-rich-black rounded-[2rem] hover:bg-rich-black/90 hover:shadow-xl hover:shadow-rich-black/20 transition-all group scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-accent-gold">
                      <Beaker size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">Testing Environment</p>
                      <h4 className="font-semibold text-lg">
                        {selectedRole === 'tasker' ? 'Quick Dev Provider Login' : 'Quick Dev Client Login'}
                      </h4>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-accent-gold group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-warm-gray/50"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-bold text-rich-black/30">
                    <span className="bg-white px-6">
                      {selectedRole === 'tasker' ? 'Production Provider Login' : 'Production Client Login'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-warm-gray/60 py-4 rounded-2xl hover:bg-primary-bg transition-all group disabled:opacity-50 font-medium text-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    Google
                  </button>

                  <button 
                    onClick={() => setStep('email-input')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-warm-gray/60 py-4 rounded-2xl hover:bg-primary-bg transition-all group disabled:opacity-50 font-medium text-sm"
                  >
                    <Mail size={18} className="text-rich-black/40" />
                    Email
                  </button>
                </div>

                <button 
                  onClick={() => setStep('phone-input')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-4 bg-rich-black text-white py-5 rounded-2xl hover:bg-rich-black/90 transition-all shadow-xl shadow-rich-black/10 disabled:opacity-50 font-semibold"
                >
                  <Phone size={20} className="text-accent-gold" />
                  Continue with Phone
                </button>

                <button 
                  onClick={() => setStep('manual-login')}
                  className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-rich-black/20 hover:text-accent-gold transition-all"
                >
                  Other Login Options
                </button>
              </div>
            </motion.div>
          )}

          {step === 'manual-login' && (
            <motion.div 
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Identifier (Email or Phone)</label>
                  <input 
                    type="text" 
                    placeholder="Enter anything for testing..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 px-6 focus:outline-none focus:border-accent-gold transition-all"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Display Name</label>
                  <input 
                    type="text" 
                    placeholder="Guest User"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 px-6 focus:outline-none focus:border-accent-gold transition-all"
                  />
                </div>
                <button 
                  onClick={() => handleDeveloperLogin()}
                  disabled={loading || !email}
                  className="w-full bg-rich-black text-white py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-rich-black/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Instant Access'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'email-input' && (
            <motion.div 
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-rich-black/20" size={18} />
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleEmailNext}
                  disabled={loading || !email}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Continue'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'password-input' && (
            <motion.div 
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-rich-black/20" size={18} />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleEmailAuth}
                  disabled={loading || !password}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Login'}
                  {!loading && <CheckCircle2 size={18} />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'registration-confirm' && (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-8"
            >
              <div className="w-20 h-20 bg-accent-gold/10 text-accent-gold rounded-full flex items-center justify-center mx-auto">
                <UserPlus size={40} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">Account Not Found</h3>
                <p className="text-sm text-rich-black/60">Would you like to register a new account with Task Molly?</p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleRegistration}
                  disabled={loading}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  Yes, Register Now
                </button>
                <button 
                  onClick={goBack}
                  disabled={loading}
                  className="w-full border border-warm-gray py-4 rounded-full font-medium hover:bg-primary-bg transition-all disabled:opacity-50"
                >
                  No, Cancel
                </button>
              </div>
            </motion.div>
          )}

          {step === 'profile-setup' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-xl font-medium mb-2">Complete Your Profile</h3>
                <p className="text-sm text-rich-black/60">Just a few more details to get started.</p>
              </div>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-rich-black/20" size={18} />
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>
                
                {(!tempUser && email) && (
                  <div className="text-left">
                    <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Set Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-rich-black/20" size={18} />
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-accent-gold transition-all"
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleProfileComplete}
                  disabled={loading || !displayName}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Complete Registration'}
                  {!loading && <CheckCircle2 size={18} />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'phone-input' && (
            <motion.div 
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-rich-black/20" size={18} />
                    <input 
                      type="tel" 
                      placeholder="+254 7XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSendOtp}
                  disabled={loading || !phoneNumber}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Code'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'otp-input' && (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-rich-black/40 hover:text-accent-gold transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold ml-4 mb-2 block">Verification Code</label>
                  <input 
                    type="text" 
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-4 px-6 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-accent-gold transition-all"
                    maxLength={6}
                  />
                </div>
                <button 
                  onClick={handleVerifyOtp}
                  disabled={loading || verificationCode.length < 6}
                  className="w-full bg-accent-gold text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify & Continue'}
                  {!loading && <CheckCircle2 size={18} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-[10px] text-center text-rich-black/20 uppercase tracking-[0.2em]">
          Secure Authentication System
        </p>
      </motion.div>
    </div>
  );
}
