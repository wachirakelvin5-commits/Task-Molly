/**
 * Builds the visit event that src/lib/analytics.ts writes to the `analytics` collection.
 *
 * Kept separate (no browser or Firebase app code) so tests/firestore.rules.test.ts can send
 * exactly this event to the rules. If you add or change a field here, update the `analytics`
 * rule in firestore.rules too, and check the cost notes in
 * .claude/skills/ops-cost/references/code-rules.md.
 */
import { serverTimestamp } from 'firebase/firestore';

export type AnalyticsEventType = 'page_view' | 'page_exit' | 'blog_view';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** Time on a page longer than this is capped (tab left open overnight). */
export const MAX_PAGE_MS = 30 * 60 * 1000;

export interface EventContext {
  sessionId: string;
  isNewSession: boolean;
  visitorId: string;
  device: DeviceType;
  signedIn: boolean;
  /** Only used on the first event of a session. */
  referrer: string;
}

export function buildAnalyticsEvent(
  type: AnalyticsEventType,
  data: { page: string; title?: string; durationMs?: number },
  ctx: EventContext,
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    type,
    page: data.page.slice(0, 200),
    sessionId: ctx.sessionId,
    visitorId: ctx.visitorId,
    device: ctx.device,
    signedIn: ctx.signedIn,
    timestamp: serverTimestamp(),
  };
  if (ctx.isNewSession) {
    event.newSession = true;
    event.referrer = ctx.referrer.slice(0, 253);
  }
  if (data.title) event.title = data.title.slice(0, 200);
  if (typeof data.durationMs === 'number') {
    event.durationMs = Math.round(Math.min(Math.max(0, data.durationMs), MAX_PAGE_MS));
  }
  return event;
}
