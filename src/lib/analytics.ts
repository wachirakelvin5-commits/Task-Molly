/**
 * Anonymous visit tracking for the admin "Site analytics" screen.
 *
 * Writes small events to the Firestore `analytics` collection (anyone may create, only admins
 * may read: see firestore.rules). No names, emails, phone numbers or IP addresses are stored:
 * a visitor is a random id kept in this browser, and a session ends after 30 minutes idle.
 *
 * Events:
 *   page_view  { page }               a screen was opened
 *   page_exit  { page, durationMs }   the visitor left that screen (or hid the tab)
 *   blog_view  { page, title }        a blog article was opened
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type AnalyticsEventType = 'page_view' | 'page_exit' | 'blog_view';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const VISITOR_KEY = 'taskmolly_visitor_id';
const SESSION_KEY = 'taskmolly_session';
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Time on a page longer than this is capped (tab left open overnight). */
const MAX_PAGE_MS = 30 * 60 * 1000;

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : Math.random().toString(36).slice(2, 18);

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // Private mode or blocked storage: track without remembering.
  }
}

function visitorId(): string {
  const s = storage('local');
  let id = s?.getItem(VISITOR_KEY);
  if (!id) {
    id = randomId();
    s?.setItem(VISITOR_KEY, id);
  }
  return id;
}

let memorySession: { id: string; last: number } | null = null;

/** The current session, starting a new one after 30 minutes without activity. */
function session(now = Date.now()): { id: string; isNew: boolean } {
  const s = storage('local');
  let current = memorySession;
  try {
    current = JSON.parse(s?.getItem(SESSION_KEY) || 'null') || memorySession;
  } catch {
    // Ignore a corrupted value.
  }
  const isNew = !current || now - current.last > SESSION_IDLE_MS;
  const id = isNew ? randomId() : current!.id;
  memorySession = { id, last: now };
  s?.setItem(SESSION_KEY, JSON.stringify(memorySession));
  return { id, isNew };
}

export function deviceType(): DeviceType {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua) || window.innerWidth < 640) return 'mobile';
  return 'desktop';
}

/** Where the visit came from: another site's hostname, or "direct". */
function referrer(): string {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    return host && host !== window.location.hostname ? host.replace(/^www\./, '') : 'direct';
  } catch {
    return 'direct';
  }
}

function enabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Only the live site counts, and automated browsers (tests, bots) are skipped.
  if (!import.meta.env.PROD && import.meta.env.VITE_TRACK_ANALYTICS !== 'true') return false;
  return !navigator.webdriver;
}

export function track(type: AnalyticsEventType, data: { page: string; title?: string; durationMs?: number }) {
  if (!enabled()) return;
  const s = session();
  const event: Record<string, unknown> = {
    type,
    page: data.page.slice(0, 200),
    sessionId: s.id,
    visitorId: visitorId(),
    device: deviceType(),
    signedIn: !!auth.currentUser,
    timestamp: serverTimestamp(),
  };
  if (s.isNew) {
    event.newSession = true;
    event.referrer = referrer();
  }
  if (data.title) event.title = data.title.slice(0, 200);
  if (typeof data.durationMs === 'number') event.durationMs = Math.round(Math.min(Math.max(0, data.durationMs), MAX_PAGE_MS));
  addDoc(collection(db, 'analytics'), event).catch(() => {
    // Analytics must never get in the visitor's way.
  });
}

// ---------------------------------------------------------------------------
// Page tracking: call trackPage() whenever the visible screen changes.
// ---------------------------------------------------------------------------

let currentPage: string | null = null;
let shownSince = 0; // When the page was last made visible (0 while hidden).
let visibleMs = 0; // Visible time on the current page before the last hide.

function exitCurrentPage() {
  if (!currentPage) return;
  const total = visibleMs + (shownSince ? Date.now() - shownSince : 0);
  if (total >= 1000) track('page_exit', { page: currentPage, durationMs: total });
  visibleMs = 0;
  shownSince = 0;
}

let listening = false;
function listenForHide() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    if (!currentPage) return;
    if (document.visibilityState === 'hidden') {
      // Report time so far: on phones the tab may never come back.
      const page = currentPage;
      exitCurrentPage();
      currentPage = page;
    } else {
      shownSince = Date.now();
    }
  });
}

export function trackPage(page: string) {
  if (page === currentPage) return;
  listenForHide();
  exitCurrentPage();
  currentPage = page;
  visibleMs = 0;
  shownSince = document.visibilityState === 'visible' ? Date.now() : 0;
  track('page_view', { page });
}
