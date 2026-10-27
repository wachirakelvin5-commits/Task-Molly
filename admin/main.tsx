import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import AdminApp from './AdminApp';
import './admin.css';

// Same Sentry project as the customer app, tagged so admin errors are easy to tell apart.
Sentry.init({
  dsn: 'https://c2f9f28ce495f126c31e2136f53a9f37@o4512222008115200.ingest.us.sentry.io/4512244547977216',
  enabled: import.meta.env.PROD,
  environment: `admin-${import.meta.env.MODE}`,
  sendDefaultPii: false,
});

createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
