import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { auth } from '../../src/firebase';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function SignInPage({ denied }: { denied: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // They closed the Google window: nothing to report.
      } else if (code === 'auth/unauthorized-domain') {
        setError(`Sign-in isn't enabled for ${window.location.hostname} yet. Add it in Firebase → Authentication → Settings → Authorized domains.`);
      } else if (code === 'auth/popup-blocked') {
        setError('Your browser blocked the Google window. Allow pop-ups for this site and try again.');
      } else {
        setError('Sign-in failed. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-warm-gray/60 rounded-3xl shadow-sm p-8 text-center">
        <span className="inline-flex p-3 rounded-2xl bg-primary-bg text-accent-gold mb-4">
          <ShieldCheck size={26} />
        </span>
        <h1 className="text-xl font-black text-rich-black tracking-tight">Task Molly Admin</h1>
        <p className="text-xs text-rich-black/50 mt-1 mb-6">For Task Molly administrators only.</p>

        {denied && (
          <div role="alert" className="mb-5 flex items-start gap-2 text-left bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3 text-xs">
            <ShieldAlert size={16} className="shrink-0 mt-px" />
            <span>
              <strong>No access.</strong> {denied} is not an admin account, so it has been signed out.
            </span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-5 text-left bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={signIn}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-white border border-warm-gray rounded-xl px-4 py-3 text-sm font-semibold text-rich-black hover:border-rich-black/40 disabled:opacity-60 transition-colors"
        >
          <GoogleLogo /> {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
