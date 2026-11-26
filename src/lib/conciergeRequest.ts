// task-molly concierge (the /premium page): turns what the visitor wrote into a request.
// Signed in: saved straight away (Tasks → New Tasks). Signed out: kept in the browser and
// saved to their account after they sign up / sign in (see pendingRequestService), so
// signed-out visitors never write to the database.
import type { ServiceCategory } from './requestModel';

export const CONCIERGE_SERVICE = 'task-molly concierge';
export const CONCIERGE_TAGLINE = 'Premium Requests (a month +)';
// Concierge requests go to the same providers as Errand Runner & Concierge.
const CONCIERGE_CATEGORY: ServiceCategory = 'Outdoor & Relocation';

export function buildConciergeRequest(notes: string, now: Date = new Date()) {
  return {
    title: CONCIERGE_SERVICE,
    serviceType: CONCIERGE_SERVICE,
    serviceId: 'errand_runner',
    serviceCategory: CONCIERGE_CATEGORY,
    requestKind: 'premium',
    description: `${CONCIERGE_TAGLINE}\n\n${notes.trim()}`.slice(0, 2000),
    location: 'To be confirmed',
    neighborhood: 'Nairobi',
    urgency: 'Premium (a month +)',
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    paymentStatus: 'pending',
  };
}

/** Where "Go to tasks & requests" leads: the task list, or sign-up first (then the task list). */
export function tasksLink(signedIn: boolean): string {
  return signedIn ? '/tasks' : '/auth?mode=signup&redirect=/tasks';
}
