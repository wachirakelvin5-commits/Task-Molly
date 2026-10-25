import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Error monitoring. Only the production build reports, so local testing doesn't use up the quota.
Sentry.init({
  dsn: 'https://c2f9f28ce495f126c31e2136f53a9f37@o4512222008115200.ingest.us.sentry.io/4512244547977216',
  enabled: import.meta.env.PROD,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  // Page-load performance for 10% of visits.
  tracesSampleRate: 0.1,
  // Client names, phones and addresses pass through the app: don't attach user IPs or request data.
  sendDefaultPii: false,
});

// Register the service worker and keep the installed app up to date.
// The browser only looks for a new version when a page is opened, so an app left open
// (or resumed from the background on a phone) could keep showing an old version.
// Check again whenever the app comes back into view, when the connection returns, and
// every 30 minutes. With autoUpdate, a new version is installed and the page reloads itself.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => {
      if (!navigator.onLine) return;
      registration.update().catch(() => {
        // Offline or the server is unreachable: try again on the next trigger.
      });
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('online', checkForUpdate);
    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
  },
});

createRoot(document.getElementById('root')!, {
  // Report React render errors, not just uncaught script errors.
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
