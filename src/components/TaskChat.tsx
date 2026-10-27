import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ChatMessage,
  ChatRole,
  MAX_MESSAGE_LENGTH,
  canSendMessages,
  sendMessage,
  watchMessages,
} from '../lib/taskChat';

const ROLE_LABEL = { client: 'Client', provider: 'Provider', admin: 'Task Molly' } as const;

function formatTime(d: Date | null) {
  if (!d) return 'Sending…';
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

/**
 * The message thread of one task.
 * - `me` set: the client or provider, who can send while the task is active.
 * - `me` unset: read-only (the admin view), showing who sent each message.
 */
export function ChatThread({
  request,
  me,
  className = '',
}: {
  request: { id: string; status?: string };
  me?: { uid: string; role: ChatRole; name: string };
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    return watchMessages(
      request.id,
      (list) => {
        setMessages(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Could not load messages:', err);
        setError(
          (err as { code?: string }).code === 'permission-denied'
            ? 'Messages can’t be shown yet: the database rules that allow chat haven’t been published.'
            : 'Could not load messages. Check your connection.',
        );
        setLoading(false);
      },
    );
  }, [request.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const open = canSendMessages(request);

  async function send() {
    if (!me || !text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(request.id, me, text);
      setText('');
    } catch (err) {
      console.error('Could not send message:', err);
      toast.error('Message not sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-2">
        {loading ? (
          <p className="py-8 text-center text-xs text-rich-black/40">Loading messages…</p>
        ) : error ? (
          <p className="py-6 px-3 text-center text-xs text-red-600">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-rich-black/45">
            {me ? 'No messages yet. Say hello, or share gate directions and special instructions.' : 'No messages between the client and provider yet.'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = me ? m.senderId === me.uid : m.senderRole === 'client';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    mine ? 'bg-rich-black text-white rounded-br-md' : 'bg-primary-bg text-rich-black border border-warm-gray/60 rounded-bl-md'
                  }`}
                >
                  {(!me || !mine) && (
                    <p className={`text-[10px] font-bold mb-0.5 ${mine ? 'text-white/60' : 'text-accent-gold'}`}>
                      {m.senderName} · {ROLE_LABEL[m.senderRole]}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/50' : 'text-rich-black/40'}`}>{formatTime(m.timestamp)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {me &&
        (open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2 pt-3 border-t border-warm-gray/60"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              placeholder="Type a message…"
              aria-label="Message"
              className="flex-1 resize-none bg-primary-bg border border-warm-gray rounded-xl px-3 py-2.5 text-sm max-h-28 focus:outline-none focus:border-accent-gold"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Send"
              className="shrink-0 p-3 rounded-xl bg-rich-black text-accent-gold disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <p className="pt-3 border-t border-warm-gray/60 text-center text-[11px] text-rich-black/45">
            This task is closed, so new messages can’t be sent.
          </p>
        ))}
    </div>
  );
}

/** Pop-up chat for the client or provider of a task. */
export function TaskChatModal({
  request,
  me,
  otherName,
  onClose,
}: {
  request: { id: string; status?: string; serviceType?: string };
  me: { uid: string; role: ChatRole; name: string };
  otherName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Messages with ${otherName}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md h-[85dvh] sm:h-[70dvh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col p-4"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-warm-gray/60">
          <div className="min-w-0">
            <p className="text-sm font-bold text-rich-black flex items-center gap-2">
              <MessageSquare size={15} className="text-accent-gold" /> {otherName}
            </p>
            <p className="text-[11px] text-rich-black/50 truncate">{request.serviceType || 'Service request'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-primary-bg">
            <X size={18} />
          </button>
        </div>
        <ChatThread request={request} me={me} className="flex-1" />
      </div>
    </div>
  );
}
