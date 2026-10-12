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

// Register service worker
registerSW({ immediate: true });

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
