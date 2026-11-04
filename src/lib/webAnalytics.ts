/**
 * Visit counting for task-molly.com: Cloudflare Web Analytics.
 *
 * Replaces the old Firestore `analytics` events, so visits no longer use the database's daily
 * write allowance (and signed-out visitors can't write to the database at all). No cookies; the
 * numbers are in the Cloudflare dashboard → Analytics & Logs → Web Analytics.
 *
 * The site token is public by design (it only lets a page send visits), so it lives here.
 * (Cloudflare dashboard → Web Analytics → task-molly.com → Manage site shows it.) Empty = nothing loads.
 */
export const CLOUDFLARE_WEB_ANALYTICS_TOKEN = '38c2bb21a77643f58d7c06fd5fb06387';

export const CLOUDFLARE_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

export function startWebAnalytics(token = CLOUDFLARE_WEB_ANALYTICS_TOKEN): void {
  if (typeof document === 'undefined' || !token) return;
  // Only the live site counts; local builds and automated browsers (tests, bots) are skipped.
  if (!import.meta.env.PROD || navigator.webdriver) return;
  if (document.querySelector(`script[src="${CLOUDFLARE_BEACON_URL}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = CLOUDFLARE_BEACON_URL;
  // spa: count route changes inside the app as page views.
  script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: true }));
  document.head.appendChild(script);
}
