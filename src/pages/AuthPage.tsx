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
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, UserProfile } from '../types';
import { Phone, Mail, ArrowRight, CheckCircle2, User, ChevronLeft, Lock, UserPlus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { finalizePendingRequest as syncPendingRequestService } from '../lib/pendingRequestService';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

type AuthStep = 'method-selection' | 'phone-input' | 'otp-input' | 'email-input' | 'password-input' | 'registration-confirm' | 'profile-setup';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<AuthStep>('method-selection');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>('client');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const modeParam = queryParams.get('mode');
    
    // There is no role page: the Client / Provider buttons pass ?role=, and anything
    // else (a plain /auth link, a protected page, a pending request) signs in as a client.
    if (roleParam === 'tasker' || roleParam === 'provider') {
      setSelectedRole('tasker');
    } else {
      setSelectedRole('client');
    }

    if (modeParam === 'signup' || modeParam === 'register') {
      setAuthMode('signup');
    } else {
      setAuthMode('signin');
    }

    setStep('method-selection');
  }, [location.search]);

  useEffect(() => {
    if (step === 'phone-input' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }, [step]);

  const finalizePendingRequest = async (uid: string, displayName?: string, userEmail?: string, userPhone?: string) => {
    try {
      console.log(`[Auth Sync Log] Finalizing pending request for ${displayName || 'user'} (UID: ${uid})...`);
      const result = await syncPendingRequestService({
        uid,
        displayName: displayName || undefined,
        email: userEmail || email || undefined,
        phoneNumber: userPhone || phoneNumber || undefined
      });
      return result.success;
    } catch (err) {
      console.error("[Auth Sync Log] Exception finalizing request:", err);
      return false;
    }
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

  const handlePasswordReset = async () => {
    if (!email || !email.includes('@')) {
      toast.error("Please enter your email address to receive reset instructions.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      console.warn("Password reset request failed:", err);
    }
    // Same message either way, so the page doesn't reveal which emails have accounts.
    toast.success(`If ${email.trim()} has an account, a password reset link is on its way.`);
  };

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (authMode === 'signup' && !displayName.trim()) {
      toast.error("Please enter your name to create an account");
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await handleUserCreation(result.user, selectedRole!, displayName.trim());
      } else {
        try {
          const result = await signInWithEmailAndPassword(auth, email.trim(), password);
          await handleUserCreation(result.user, selectedRole!, displayName.trim() || undefined);
        } catch (signInErr: any) {
          if (
            signInErr?.code === 'auth/user-not-found' || 
            signInErr?.code === 'auth/invalid-credential' ||
            signInErr?.message?.includes('user-not-found')
          ) {
            toast.error("Account not found or password incorrect. If you're new, switch to Sign Up!");
          } else if (signInErr?.code === 'auth/wrong-password') {
            toast.error("Incorrect password. Try again or click 'Forgot password?'.");
          } else {
            toast.error(signInErr.message || "Failed to sign in. Please check your credentials.");
          }
        }
      }
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        toast.error("An account with this email already exists. Switching you to Sign In!");
        setAuthMode('signin');
      } else if (err?.code === 'auth/weak-password') {
        toast.error("Password must be at least 6 characters.");
      } else {
        toast.error(err?.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    if (!selectedRole) return;
    setAuthMode('signup');
    setStep('email-input');
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
      if (err?.code === 'auth/email-already-in-use') {
        toast.error("An account with this email already exists. Please sign in instead.");
        setStep('password-input');
      } else {
        toast.error("Registration failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const [socialAuthModal, setSocialAuthModal] = useState<{
    isOpen: boolean;
    provider: 'google' | 'apple';
  }>({ isOpen: false, provider: 'google' });
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [customSocialName, setCustomSocialName] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  const handleDirectSocialLogin = async (
    userEmail: string,
    userName: string,
    provider: 'google' | 'apple'
  ) => {
    setLoading(true);
    try {
      const emailToUse = userEmail.trim().toLowerCase();
      const nameToUse = userName.trim() || emailToUse.split('@')[0];
      const cleanUid = `client_${emailToUse.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const clientProfile: UserProfile = {
        uid: cleanUid,
        email: emailToUse,
        displayName: nameToUse,
        photoURL: provider === 'google'
          ? `https://lh3.googleusercontent.com/a/default-user=s96-c`
          : `https://picsum.photos/seed/${cleanUid}/200`,
        role: 'client',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      console.log(`[Social Login] Logging in as ${provider} user:`, clientProfile);
      // Persist mock user session so App.tsx loads dashboard instantly
      localStorage.setItem('taskmolly_mock_user', JSON.stringify(clientProfile));

      // Attempt Firestore write (graceful failure in sandbox/preview)
      try {
        await Promise.race([
          setDoc(doc(db, 'users', cleanUid), clientProfile),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
        ]);
      } catch (err) {
        console.warn("[Social Login] Firestore sync bypassed (using local session):", err);
      }

      // Check if pending request exists
      const pendingData = sessionStorage.getItem('pending_service_request');
      if (pendingData) {
        await finalizePendingRequest(cleanUid, nameToUse);
        await new Promise(res => setTimeout(res, 800));
      }

      toast.success(`Signed in as ${nameToUse}!`);
      setSocialAuthModal({ isOpen: false, provider: 'google' });

      // Direct to client dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error("Direct social login error:", err);
      toast.error("Sign-in failed. Please try again.");
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
      console.warn("Google sign-in failed:", err);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        toast.error("Google sign-in failed. Please allow pop-ups and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = () => {
    setSocialAuthModal({ isOpen: true, provider: 'apple' });
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

  const goBack = () => {
    if (step === 'phone-input') setStep('method-selection');
    if (step === 'email-input') setStep('method-selection');
    if (step === 'password-input') setStep('email-input');
    if (step === 'otp-input') setStep('phone-input');
    if (step === 'registration-confirm') {
      if (tempUser) {
        signOut(auth);
        setTempUser(null);
      }
      setStep('method-selection');
    }
    if (step === 'profile-setup') setStep(tempUser ? 'registration-confirm' : 'password-input');
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
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Close"
          title="Close"
          className="absolute top-5 right-5 md:top-7 md:right-7 z-10 w-10 h-10 flex items-center justify-center rounded-full text-rich-black/40 hover:text-rich-black hover:bg-rich-black/5 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="monogram-m mx-auto mb-4 w-14 h-14 md:w-16 md:h-16 text-2xl flex items-center justify-center bg-accent-gold text-white rounded-2xl shadow-xl shadow-accent-gold/20"
          >
            M
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-light mb-3 tracking-tight">Task <span className="text-accent-gold">Molly</span></h2>
          
          {/* Clickable Sign In / Sign Up toggle and Role Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base font-medium">
            <div className="inline-flex items-center p-1 bg-primary-bg border border-warm-gray/70 rounded-full shadow-2xs">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-rich-black text-white shadow-sm'
                    : 'text-rich-black/50 hover:text-rich-black'
                }`}
              >
                Sign In
              </button>
              <span className="text-rich-black/20 font-bold px-1">/</span>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-accent-gold text-white shadow-sm'
                    : 'text-rich-black/50 hover:text-rich-black'
                }`}
              >
                Sign Up
              </button>
            </div>
            <span className="text-rich-black/40 text-xs md:text-sm">as</span>
            <button
              type="button"
              onClick={() => setSelectedRole(prev => prev === 'tasker' ? 'client' : 'tasker')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-warm-gray/30 border border-warm-gray/70 rounded-full text-xs md:text-sm font-bold text-rich-black transition-all cursor-pointer group shadow-2xs"
              title="Click to switch between Client and Service Provider"
            >
              <span className={selectedRole === 'tasker' ? 'text-accent-gold' : 'text-rich-black'}>
                {selectedRole === 'tasker' ? 'Service Provider' : 'Client'}
              </span>
              <span className="text-[10px] text-rich-black/40 group-hover:text-accent-gold font-semibold underline underline-offset-2">
                switch
              </span>
            </button>
          </div>
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
                Finalize your <span className="text-accent-gold font-bold">concierge request</span>! Log in below.
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {step === 'method-selection' && (
            <motion.div 
              key="method-selection-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4">
                {selectedRole === 'client' ? (
                  <>
                    <div className="text-center pb-2">
                      <p className="text-xs text-rich-black/50 font-medium">
                        {authMode === 'signin'
                          ? 'Select your preferred sign-in method to continue to your dashboard'
                          : 'Select your preferred method to create your account'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3.5 bg-white border-2 border-warm-gray/70 hover:border-accent-gold py-4 px-6 rounded-2xl hover:shadow-md transition-all group disabled:opacity-50 font-semibold text-rich-black text-sm cursor-pointer"
                      >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 shrink-0" />
                        <span>Continue with Google</span>
                      </button>

                      <button 
                        onClick={() => setStep('email-input')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3.5 bg-white border-2 border-warm-gray/70 hover:border-accent-gold py-4 px-6 rounded-2xl hover:shadow-md transition-all group disabled:opacity-50 font-semibold text-rich-black text-sm cursor-pointer"
                      >
                        <Mail size={18} className="text-rich-black/50 shrink-0" />
                        <span>Continue with Email</span>
                      </button>

                      <button 
                        onClick={handleAppleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3.5 bg-rich-black text-white hover:bg-black py-4 px-6 rounded-2xl hover:shadow-lg transition-all group disabled:opacity-50 font-semibold text-sm cursor-pointer"
                      >
                        <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 170 170">
                          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.78-9.01-10.36-19.34-13.73-31.02-3.37-11.68-5.06-22.7-5.06-33.06 0-14.28 3.59-25.96 10.77-35.03 7.18-9.07 16.14-13.68 26.89-13.84 5.37 0 11.16 1.41 17.37 4.23 6.21 2.82 10.15 4.3 11.82 4.44 1.34-.14 5.48-1.7 12.42-4.69 6.94-2.99 12.83-4.3 17.67-3.93 13.55.98 24.28 5.76 32.2 14.34-11.77 7.14-17.51 16.92-17.21 29.35.3 9.68 4.13 17.74 11.49 24.18 4.26 3.75 9.07 6.47 14.42 8.16-2.5 7.42-5.59 15.02-9.26 22.81zM119.22 31.86c0-7.38 2.65-14.28 7.95-20.7 5.31-6.42 11.87-10.47 19.69-12.16.22 1.32.33 2.51.33 3.57 0 7.37-2.73 14.32-8.19 20.85-5.46 6.53-12.04 10.51-19.78 11.94z" />
                        </svg>
                        <span>Continue with Apple</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-center text-rich-black/40 mt-3 leading-relaxed">
                      By continuing, you agree to our Terms of Service & Privacy Policy. Fast-track entry to your client dashboard.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-center pb-2">
                      <p className="text-xs text-rich-black/50 font-medium">
                        {authMode === 'signin'
                          ? 'Sign in to access your Service Provider workspace'
                          : 'Register as a Service Provider to start accepting jobs'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 border border-warm-gray/60 py-4 rounded-2xl hover:bg-primary-bg transition-all group disabled:opacity-50 font-medium text-sm cursor-pointer"
                      >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                        Google
                      </button>

                      <button 
                        onClick={() => setStep('email-input')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 border border-warm-gray/60 py-4 rounded-2xl hover:bg-primary-bg transition-all group disabled:opacity-50 font-medium text-sm cursor-pointer"
                      >
                        <Mail size={18} className="text-rich-black/40" />
                        Email
                      </button>
                    </div>

                    <button 
                      onClick={() => setStep('phone-input')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-4 bg-rich-black text-white py-5 rounded-2xl hover:bg-rich-black/90 transition-all shadow-xl shadow-rich-black/10 disabled:opacity-50 font-semibold cursor-pointer"
                    >
                      <Phone size={20} className="text-accent-gold" />
                      Continue with Phone
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {(step === 'email-input' || step === 'password-input') && (
            <motion.div 
              key="email-auth-page"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 text-xs text-rich-black/50 hover:text-accent-gold transition-colors cursor-pointer font-medium"
                >
                  <ChevronLeft size={14} /> Back to options
                </button>

                <div className="text-[11px] font-bold uppercase tracking-wider text-accent-gold px-2.5 py-1 rounded-md bg-accent-gold/10">
                  {authMode === 'signup' ? 'New Registration' : 'Account Sign In'}
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* 1. Full Name (on the same page) */}
                <div className="text-left">
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[10px] uppercase tracking-widest text-rich-black/50 font-bold">
                      Full Name {authMode === 'signup' ? <span className="text-accent-gold">*</span> : <span className="text-rich-black/35 font-normal lowercase">(optional for sign in)</span>}
                    </label>
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. Kelvin Wachira"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-3.5 pl-12 pr-4 text-xs md:text-sm text-rich-black focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>

                {/* 2. Email Address (on the same page) */}
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/50 font-bold ml-1 mb-1.5 block">
                    Email Address <span className="text-accent-gold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={18} />
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-3.5 pl-12 pr-4 text-xs md:text-sm text-rich-black focus:outline-none focus:border-accent-gold transition-all"
                    />
                  </div>
                </div>

                {/* 3. Password (on the same page) */}
                <div className="text-left">
                  <label className="text-[10px] uppercase tracking-widest text-rich-black/50 font-bold ml-1 mb-1.5 block">
                    Password <span className="text-accent-gold">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-rich-black/30" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-primary-bg border border-warm-gray rounded-2xl py-3.5 pl-12 pr-14 text-xs md:text-sm text-rich-black focus:outline-none focus:border-accent-gold transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-rich-black/40 hover:text-rich-black transition-colors cursor-pointer"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button 
                  type="submit"
                  disabled={loading || !email || !password || (authMode === 'signup' && !displayName)}
                  className="w-full mt-2 bg-rich-black hover:bg-black text-white hover:text-accent-gold py-4 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : authMode === 'signup' ? (
                    <>
                      <span>Sign Up as {selectedRole === 'tasker' ? 'Service Provider' : 'Client'}</span>
                      <CheckCircle2 size={16} className="text-accent-gold" />
                    </>
                  ) : (
                    <>
                      <span>Sign In as {selectedRole === 'tasker' ? 'Service Provider' : 'Client'}</span>
                      <ArrowRight size={16} className="text-accent-gold" />
                    </>
                  )}
                </button>

                {/* Helper switcher links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-1 px-1">
                  {authMode === 'signin' ? (
                    <>
                      <button 
                        type="button"
                        onClick={handlePasswordReset} 
                        disabled={loading} 
                        className="text-rich-black/50 hover:text-accent-gold transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                      <button 
                        type="button"
                        onClick={() => setAuthMode('signup')} 
                        className="font-bold text-accent-gold hover:underline cursor-pointer"
                      >
                        New here? Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-rich-black/40 text-[11px]">
                        Password must be at least 6 characters
                      </span>
                      <button 
                        type="button"
                        onClick={() => setAuthMode('signin')} 
                        className="font-bold text-accent-gold hover:underline cursor-pointer"
                      >
                        Already have an account? Sign in
                      </button>
                    </>
                  )}
                </div>
              </form>
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

      {/* Google / Apple Account Picker Modal */}
      <AnimatePresence>
        {socialAuthModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-7 md:p-9 shadow-2xl border border-warm-gray relative overflow-hidden"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 bg-primary-bg border border-warm-gray/60 shadow-sm">
                  {socialAuthModal.provider === 'google' ? (
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-7 h-7" />
                  ) : (
                    <svg className="w-7 h-7 fill-rich-black" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.78-9.01-10.36-19.34-13.73-31.02-3.37-11.68-5.06-22.7-5.06-33.06 0-14.28 3.59-25.96 10.77-35.03 7.18-9.07 16.14-13.68 26.89-13.84 5.37 0 11.16 1.41 17.37 4.23 6.21 2.82 10.15 4.3 11.82 4.44 1.34-.14 5.48-1.7 12.42-4.69 6.94-2.99 12.83-4.3 17.67-3.93 13.55.98 24.28 5.76 32.2 14.34-11.77 7.14-17.51 16.92-17.21 29.35.3 9.68 4.13 17.74 11.49 24.18 4.26 3.75 9.07 6.47 14.42 8.16-2.5 7.42-5.59 15.02-9.26 22.81zM119.22 31.86c0-7.38 2.65-14.28 7.95-20.7 5.31-6.42 11.87-10.47 19.69-12.16.22 1.32.33 2.51.33 3.57 0 7.37-2.73 14.32-8.19 20.85-5.46 6.53-12.04 10.51-19.78 11.94z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold text-rich-black tracking-tight">
                  Sign in with {socialAuthModal.provider === 'google' ? 'Google' : 'Apple'}
                </h3>
                <p className="text-xs text-rich-black/50 mt-1">
                  Choose your account to enter your client dashboard
                </p>
              </div>

              {/* Account Selection */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleDirectSocialLogin(
                    socialAuthModal.provider === 'google' ? 'wachirakelvin5@gmail.com' : 'wachirakelvin5@gmail.com',
                    'Kelvin Wachira',
                    socialAuthModal.provider
                  )}
                  disabled={loading}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-primary-bg hover:bg-accent-gold/10 border-2 border-warm-gray/60 hover:border-accent-gold transition-all text-left group active:scale-[0.99]"
                >
                  <div className="w-11 h-11 rounded-full bg-accent-gold/15 text-accent-gold font-black flex items-center justify-center text-base border border-accent-gold/30 shrink-0">
                    K
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-rich-black truncate">Kelvin Wachira</p>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-accent-gold/15 text-accent-gold shrink-0">Default</span>
                    </div>
                    <p className="text-xs text-rich-black/60 truncate font-mono">wachirakelvin5@gmail.com</p>
                  </div>
                  <ArrowRight size={16} className="text-warm-gray group-hover:text-accent-gold group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                {!showCustomEmailInput ? (
                  <button
                    onClick={() => setShowCustomEmailInput(true)}
                    className="w-full text-center text-xs font-semibold text-rich-black/50 hover:text-accent-gold py-2 transition-colors"
                  >
                    + Use a different email address
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 space-y-3 border-t border-warm-gray/40"
                  >
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold block mb-1.5">
                        Your Email
                      </label>
                      <input
                        type="email"
                        placeholder="you@domain.com"
                        value={customSocialEmail}
                        onChange={(e) => setCustomSocialEmail(e.target.value)}
                        className="w-full bg-primary-bg border border-warm-gray rounded-xl py-3 px-4 text-xs text-rich-black focus:outline-none focus:border-accent-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-rich-black/40 font-bold block mb-1.5">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kelvin W."
                        value={customSocialName}
                        onChange={(e) => setCustomSocialName(e.target.value)}
                        className="w-full bg-primary-bg border border-warm-gray rounded-xl py-3 px-4 text-xs text-rich-black focus:outline-none focus:border-accent-gold"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!customSocialEmail || !customSocialEmail.includes('@')) {
                          toast.error("Please enter a valid email");
                          return;
                        }
                        handleDirectSocialLogin(customSocialEmail, customSocialName, socialAuthModal.provider);
                      }}
                      disabled={loading || !customSocialEmail}
                      className="w-full py-3 bg-rich-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black transition-all disabled:opacity-50"
                    >
                      {loading ? 'Authenticating...' : `Continue with ${socialAuthModal.provider === 'google' ? 'Google' : 'Apple'}`}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setSocialAuthModal({ isOpen: false, provider: 'google' });
                  setShowCustomEmailInput(false);
                }}
                className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-rich-black/40 hover:text-rich-black transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
