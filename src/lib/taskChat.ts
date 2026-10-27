/**
 * Messages between a task's client and provider, stored under
 * serviceRequests/{requestId}/messages. firestore.rules lets only the two of them (and the
 * admins) read the thread, and only the two of them write, while the task is active.
 */
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from './requestModel';

export type ChatRole = 'client' | 'provider';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: ChatRole | 'admin';
  senderName: string;
  text: string;
  /** null for a message still being sent. */
  timestamp: Date | null;
}

export const MAX_MESSAGE_LENGTH = 1000;

/** Statuses in which the two sides can still send messages (keep in sync with firestore.rules). */
export const CHAT_OPEN_STATUSES = ['accepted', 'assigned', 'in-progress', 'awaiting-confirmation'];

/** Which side of the task this user is on, or null if they're not part of it. */
export function chatRole(request: { clientId?: string; providerId?: string | null }, uid: string | null | undefined): ChatRole | null {
  if (!uid || !request.providerId) return null; // A thread starts once a provider has taken the task.
  if (request.clientId === uid) return 'client';
  if (request.providerId === uid) return 'provider';
  return null;
}

export function canSendMessages(request: { status?: string }): boolean {
  return CHAT_OPEN_STATUSES.includes(request.status || '');
}

export function normalizeMessage(id: string, data: Record<string, any>): ChatMessage {
  const role = data.senderRole === 'provider' || data.senderRole === 'admin' ? data.senderRole : 'client';
  return {
    id,
    senderId: String(data.senderId || ''),
    senderRole: role,
    senderName: String(data.senderName || (role === 'provider' ? 'Provider' : 'Client')),
    text: String(data.text || ''),
    timestamp: toDate(data.timestamp),
  };
}

/** Live list of a task's messages, oldest first. Returns the unsubscribe function. */
export function watchMessages(
  requestId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, 'serviceRequests', requestId, 'messages'), orderBy('timestamp', 'asc')),
    { includeMetadataChanges: false },
    (snap) => onMessages(snap.docs.map((d) => normalizeMessage(d.id, d.data({ serverTimestamps: 'estimate' })))),
    onError,
  );
}

export function sendMessage(
  requestId: string,
  sender: { uid: string; role: ChatRole; name: string },
  text: string,
) {
  const clean = text.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!clean) return Promise.resolve();
  return addDoc(collection(db, 'serviceRequests', requestId, 'messages'), {
    senderId: sender.uid,
    senderRole: sender.role,
    senderName: sender.name.slice(0, 100),
    text: clean,
    timestamp: serverTimestamp(),
  });
}
