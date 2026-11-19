// Randoms: anonymous community posts (the "Random" tab on the home page).
// Stored in the Firestore `forum` collection. No user id, name or photo is stored:
// a Random is identified only by its own random ID ("Random xyd4954y").
// Keep the record shapes here in sync with the `forum` rules in firestore.rules.

export const RANDOM_ID_LENGTH = 8;
export const RANDOM_MAX_LENGTH = 1000;
export const COMMENT_MAX_LENGTH = 500;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** A fresh 8-character ID such as "xyd4954y". It is also the Firestore document id. */
export function generateRandomId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < RANDOM_ID_LENGTH; i++) {
    id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  }
  return id;
}

export function isRandomId(id: string): boolean {
  return new RegExp(`^[a-z0-9]{${RANDOM_ID_LENGTH}}$`).test(id);
}

/** The ID shown for a post. Posts from before Randoms (no randomId) use their document id. */
export function randomIdFor(docId: string, data: Record<string, any>): string {
  if (typeof data.randomId === 'string' && isRandomId(data.randomId)) return data.randomId;
  return docId.slice(0, RANDOM_ID_LENGTH).toLowerCase();
}

export function randomLabel(randomId: string): string {
  return `Random ${randomId}`;
}

/** The record the app writes for a new Random (timestamp is the server time). */
export function buildRandomPost<T>(randomId: string, content: string, timestamp: T) {
  return {
    randomId,
    content: content.trim().slice(0, RANDOM_MAX_LENGTH),
    likes: 0,
    hates: 0,
    commentCount: 0,
    timestamp,
  };
}

/** The record the app writes for a comment on a Random. */
export function buildRandomComment<T>(content: string, timestamp: T) {
  return {
    content: content.trim().slice(0, COMMENT_MAX_LENGTH),
    timestamp,
  };
}

export type Reaction = 'like' | 'hate';

/**
 * How the like and hate counts change when someone goes from one reaction to another
 * (null = no reaction). Tapping the same emoji again takes the reaction back.
 * Each count moves by at most one, which is what the rules allow.
 */
export function reactionChange(
  previous: Reaction | null,
  tapped: Reaction,
): { next: Reaction | null; likes: number; hates: number } {
  const next = previous === tapped ? null : tapped;
  const count = (r: Reaction | null, which: Reaction) => (r === which ? 1 : 0);
  return {
    next,
    likes: count(next, 'like') - count(previous, 'like'),
    hates: count(next, 'hate') - count(previous, 'hate'),
  };
}

export function countOf(value: unknown): number {
  return typeof value === 'number' && value > 0 ? Math.floor(value) : 0;
}
