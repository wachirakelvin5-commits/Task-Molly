import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Toaster } from 'sonner';
import { auth } from '../../src/firebase';
import NotificationBell from './NotificationBell';
import SignInPage from './SignInPage';
import { isAllowedAdmin } from './access';

// The dashboard screens are shared with the main repo (src/pages) but only bundled here.
const AdminDashboard = lazy(() => import('../../src/pages/AdminDashboard'));
const AdminComplaints = lazy(() => import('../../src/pages/AdminComplaints'));
const AdminAnalytics = lazy(() => import('../../src/pages/AdminAnalytics'));

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#F0F2F5]">
      <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (u && !isAllowedAdmin(u)) {
          // Anyone else is signed straight back out.
          setDenied(u.email || 'This account');
          setUser(null);
          await signOut(auth).catch(() => {});
        } else {
          setUser(u);
          if (u) setDenied(null);
        }
        setChecking(false);
      }),
    [],
  );

  if (checking) return <Spinner />;

  return (
    <>
      <Toaster position="bottom-right" richColors />
      {!user ? (
        <SignInPage denied={denied} />
      ) : (
        <BrowserRouter>
          <div className="sticky top-0 z-40 bg-rich-black text-white">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={14} className="text-accent-gold" /> Task Molly Admin
              </span>
              <span className="flex items-center gap-3 min-w-0">
                <span className="truncate text-white/60 hidden sm:inline">{user.email}</span>
                <NotificationBell />
                <button
                  onClick={() => signOut(auth)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 font-semibold"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </span>
            </div>
          </div>
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* Same paths the shared screens link to each other with. */}
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
