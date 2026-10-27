/**
 * Task Molly admin website: a separate site from the customer app (deployed on its own,
 * e.g. on Vercel). It reuses the admin screens from src/pages and reads the same Firebase
 * project. firestore.rules is what protects the data; the check here only decides what to show.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { auth } from '../src/firebase';
import { ADMIN_EMAILS } from '../src/lib/admin';

const AdminDashboard = lazy(() => import('../src/pages/AdminDashboard'));
const AdminComplaints = lazy(() => import('../src/pages/AdminComplaints'));
const AdminAnalytics = lazy(() => import('../src/pages/AdminAnalytics'));

/** Matches isAdmin() in firestore.rules: an admin email that Google (or Firebase) has verified. */
function isAdmin(user: User | null): boolean {
  return !!user && user.emailVerified && ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SignIn({ deniedEmail }: { deniedEmail: string | null }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        toast.error('This website is not yet allowed to sign in. Add it under Firebase > Authentication > Settings > Authorized domains.');
      } else if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        toast.error('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F0F2F5] px-4">
      <div className="w-full max-w-sm bg-white border border-warm-gray/60 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rich-black text-white flex items-center justify-center mb-4">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-2xl font-black text-rich-black tracking-tight">Task Molly Admin</h1>
        <p className="text-sm text-rich-black/55 mt-1 mb-6">Operations dashboard for the Task Molly team</p>
        {deniedEmail && (
          <div className="mb-4 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl p-3 text-left">
            {deniedEmail} does not have admin access. Sign in with an admin Google account.
          </div>
        )}
        <button
          onClick={signIn}
          disabled={busy}
          className="w-full bg-rich-black text-white rounded-xl py-3 text-sm font-semibold hover:bg-rich-black/90 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}

function TopBar({ user }: { user: User }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
      isActive ? 'bg-white text-rich-black' : 'text-white/70 hover:text-white'
    }`;
  return (
    <header className="bg-rich-black text-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 font-black tracking-tight shrink-0">
          <ShieldCheck size={18} className="text-accent-gold" />
          <span className="hidden sm:inline">Task Molly Admin</span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto min-w-0">
          <NavLink to="/admin-dashboard" className={link}>Operations</NavLink>
          <NavLink to="/admin-complaints" className={link}>Complaints</NavLink>
          <NavLink to="/admin-analytics" className={link}>Analytics</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-xs text-white/60">{user.email}</span>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u && !isAdmin(u)) {
          // Not an admin: sign straight back out so no admin screen tries to load.
          setDeniedEmail(u.email || 'This account');
          signOut(auth);
          return;
        }
        if (u) setDeniedEmail(null);
        setUser(u);
        setReady(true);
      }),
    []
  );

  return (
    <>
      <Toaster position="top-right" richColors />
      {!ready ? (
        <Spinner />
      ) : !user ? (
        <SignIn deniedEmail={deniedEmail} />
      ) : (
        // Paths match the ones the shared admin screens link to.
        <BrowserRouter>
          <TopBar user={user} />
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin-complaints" element={<AdminComplaints />} />
              <Route path="/admin-analytics" element={<AdminAnalytics />} />
              <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      )}
    </>
  );
}
