/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { UserProfile } from './types';

// Pages
import LandingPage from './pages/LandingPage';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const ProviderServices = lazy(() => import('./pages/ProviderServices'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProviderListing = lazy(() => import('./pages/ProviderListing'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ClientTasks = lazy(() => import('./pages/ClientTasks'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminComplaints = lazy(() => import('./pages/AdminComplaints'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));

// Components
import Navbar from './components/Navbar';
import { InstallPrompt } from './components/InstallPrompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useNotifications } from './hooks/useNotifications';

function NavbarWrapper({ user, hideNavbar }: { user: UserProfile | null; hideNavbar: boolean }) {
  const location = useLocation();
  // The header only remains on the first landing page
  if (location.pathname !== '/' || hideNavbar) {
    return null;
  }
  return <Navbar user={user} />;
}

const queryClient = new QueryClient();

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [hideNavbar, setHideNavbar] = useState(false);

  useNotifications(user);

  useEffect(() => {
    // Validate connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'health-check', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network status.");
        }
      }
    };
    testConnection();

    // Check for mock user first (for testing bypass)
    const mockUserStr = localStorage.getItem('taskmolly_mock_user');
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setUser(mockUser);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('taskmolly_mock_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            console.warn("Auth user found but no user document exists");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state processing error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-primary-bg">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <InstallPrompt />
      <Router>
        <div className="min-h-[100dvh] bg-primary-bg no-scrollbar overflow-y-auto">
          <NavbarWrapper user={user} hideNavbar={hideNavbar} />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="w-10 h-10 border-3 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<LandingPage setHideNavbar={setHideNavbar} />} />
              <Route 
                path="/auth" 
                element={user ? <Navigate to={user.role === 'tasker' ? '/provider-dashboard' : '/dashboard'} /> : <AuthPage />} 
              />
              <Route 
                path="/dashboard" 
                element={user ? <Dashboard user={user} /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/tasks" 
                element={user ? <ClientTasks user={user} /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/provider-dashboard" 
                element={user ? <ProviderDashboard user={user} /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/provider-services" 
                element={user ? <ProviderServices user={user} /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/providers" 
                element={<ProviderListing />} 
              />
              <Route 
                path="/chat/:jobId" 
                element={user ? <ChatPage user={user} /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/blog" 
                element={<BlogPage />} 
              />
              <Route 
                path="/admin-dashboard" 
                element={user?.role === 'admin' || user?.email === 'wachirakelvin5@gmail.com' ? <AdminDashboard /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/admin-complaints" 
                element={user?.role === 'admin' || user?.email === 'wachirakelvin5@gmail.com' ? <AdminComplaints /> : <Navigate to="/auth" />} 
              />
              <Route 
                path="/admin-analytics" 
                element={user?.role === 'admin' || user?.email === 'wachirakelvin5@gmail.com' ? <AdminAnalytics /> : <Navigate to="/auth" />} 
              />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </QueryClientProvider>
  );
}
