import { useState, useEffect, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  collection, query, orderBy, limit, onSnapshot, getDocs, doc, setDoc, updateDoc,
  writeBatch, increment, serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { toDate } from '../lib/requestModel';
import { timeAgo } from '../../admin/src/timeAgo';
import {
  generateRandomId, randomIdFor, randomLabel, buildRandomPost, buildRandomComment,
  reactionChange, countOf, Reaction, RANDOM_MAX_LENGTH, COMMENT_MAX_LENGTH,
} from '../lib/randomPosts';

// The "Open Forum" tab (home page): anonymous posts, each shown as "Random <id>". Nothing about the person posting is stored or shown.
// Open to everyone: no sign-in or sign-up needed to read, post, react or comment.
// This is the only part of the app that works without an account.

interface RandomPost {
  id: string;
  randomId: string;
  content: string;
  likes: number;
  hates: number;
  commentCount: number;
  timestamp: Date | null;
}

interface RandomComment {
  id: string;
  content: string;
  timestamp: Date | null;
}

const FEED_LIMIT = 50;
const COMMENTS_LIMIT = 50;
const REACTIONS_KEY = 'taskmolly_random_reactions';

function loadReactions(): Record<string, Reaction> {
  try {
    return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveReactions(r: Record<string, Reaction>) {
  try {
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(r));
  } catch {
    /* storage unavailable: reactions still count, they just aren't remembered */
  }
}

export default function RandomFeed() {
  const [posts, setPosts] = useState<RandomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction>>(loadReactions);
  const [openComments, setOpenComments] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'forum'), orderBy('timestamp', 'desc'), limit(FEED_LIMIT));
    return onSnapshot(
      q,
      (snapshot) => {
        setPosts(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              randomId: randomIdFor(d.id, data),
              content: String(data.content || ''),
              likes: countOf(data.likes),
              hates: countOf(data.hates),
              commentCount: countOf(data.commentCount),
              timestamp: toDate(data.timestamp),
            };
          }),
        );
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'forum');
      },
    );
  }, []);

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;

    setPosting(true);
    // The Random's ID is its document id. The rules refuse to overwrite an existing
    // Random, so on the (very unlikely) chance an ID is taken, try a new one.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const randomId = generateRandomId();
      try {
        await setDoc(doc(db, 'forum', randomId), buildRandomPost(randomId, text, serverTimestamp()));
        setDraft('');
        toast.success(`Posted as ${randomLabel(randomId)}`);
        setPosting(false);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    setPosting(false);
    handleFirestoreError(lastError, OperationType.CREATE, 'forum');
    toast.error('Could not post. Please try again.');
  };

  const handleReact = async (post: RandomPost, tapped: Reaction) => {
    const previous = reactions[post.id] || null;
    const change = reactionChange(previous, tapped);

    const nextReactions = { ...reactions };
    if (change.next) nextReactions[post.id] = change.next;
    else delete nextReactions[post.id];
    setReactions(nextReactions);
    saveReactions(nextReactions);

    const update: Record<string, ReturnType<typeof increment>> = {};
    if (change.likes) update.likes = increment(change.likes);
    if (change.hates) update.hates = increment(change.hates);
    try {
      await updateDoc(doc(db, 'forum', post.id), update);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `forum/${post.id}`);
      setReactions(reactions);
      saveReactions(reactions);
      toast.error('Could not save your reaction.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* New post */}
      <form onSubmit={handlePost} className="p-3 md:p-4 border-b border-warm-gray/50 shrink-0 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, RANDOM_MAX_LENGTH))}
          placeholder="Share something. It's posted with its own ID, never your name."
          rows={2}
          className="w-full resize-none bg-primary-bg/70 focus:bg-white border border-warm-gray/60 focus:border-accent-gold rounded-2xl px-3.5 py-2.5 text-xs text-rich-black placeholder:text-rich-black/40 focus:outline-none transition-all"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-rich-black/40">{draft.length}/{RANDOM_MAX_LENGTH}</span>
          <button
            type="submit"
            disabled={!draft.trim() || posting}
            className="px-4 py-1.5 rounded-full bg-accent-gold text-white text-xs font-bold disabled:opacity-40 hover:bg-accent-gold/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Send size={12} />
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 space-y-3 no-scrollbar min-h-0">
        {loading && <p className="text-center text-xs text-rich-black/40 py-10">Loading posts…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-center text-xs text-rich-black/40 py-10">No posts yet. Be the first to post.</p>
        )}
        {posts.map((post) => (
          <div key={post.id}>
            <RandomCard
              post={post}
              reaction={reactions[post.id] || null}
              onReact={(r) => handleReact(post, r)}
              commentsOpen={openComments === post.id}
              onToggleComments={() => setOpenComments(openComments === post.id ? null : post.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function RandomCard({
  post, reaction, onReact, commentsOpen, onToggleComments,
}: {
  post: RandomPost;
  reaction: Reaction | null;
  onReact: (r: Reaction) => void;
  commentsOpen: boolean;
  onToggleComments: () => void;
}) {
  const reactButton = (kind: Reaction, emoji: string, count: number, label: string) => {
    const active = reaction === kind;
    return (
      <button
        type="button"
        onClick={() => onReact(kind)}
        aria-pressed={active}
        title={label}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
          active
            ? 'bg-accent-gold/15 border-accent-gold text-rich-black'
            : 'bg-white border-warm-gray/60 text-rich-black/60 hover:border-accent-gold/60'
        }`}
      >
        <span aria-hidden className="text-sm leading-none">{emoji}</span>
        <span className="tabular-nums">{count}</span>
        <span className="sr-only">{label}</span>
      </button>
    );
  };

  return (
    <div className="p-3 rounded-2xl border border-warm-gray/40 bg-primary-bg/40">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-accent-gold/10 text-accent-gold border border-accent-gold/25">
          {randomLabel(post.randomId)}
        </span>
        <span className="text-[9px] text-rich-black/40">{timeAgo(post.timestamp)}</span>
      </div>

      <p className="text-xs leading-relaxed text-rich-black/85 break-words whitespace-pre-line">{post.content}</p>

      <div className="mt-2.5 flex items-center gap-2">
        {reactButton('like', '👍', post.likes, 'Like')}
        {reactButton('hate', '👎', post.hates, 'Hate')}
        <button
          type="button"
          onClick={onToggleComments}
          aria-expanded={commentsOpen}
          className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            commentsOpen ? 'text-accent-gold' : 'text-rich-black/50 hover:text-accent-gold'
          }`}
        >
          <MessageCircle size={13} />
          <span className="tabular-nums">{post.commentCount}</span>
          <span>{post.commentCount === 1 ? 'comment' : 'comments'}</span>
        </button>
      </div>

      {commentsOpen && <RandomComments postId={post.id} />}
    </div>
  );
}

// Comments load once when opened (not live) to keep database reads low.
function RandomComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<RandomComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = query(collection(db, 'forum', postId, 'comments'), orderBy('timestamp', 'asc'), limit(COMMENTS_LIMIT));
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        setComments(snap.docs.map((d) => ({
          id: d.id,
          content: String(d.data().content || ''),
          timestamp: toDate(d.data().timestamp),
        })));
      })
      .catch((error) => {
        if (cancelled) return;
        setComments([]);
        handleFirestoreError(error, OperationType.LIST, `forum/${postId}/comments`);
      });
    return () => { cancelled = true; };
  }, [postId]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    const commentRef = doc(collection(db, 'forum', postId, 'comments'));
    const batch = writeBatch(db);
    batch.set(commentRef, buildRandomComment(text, serverTimestamp()));
    batch.update(doc(db, 'forum', postId), { commentCount: increment(1) });
    try {
      await batch.commit();
      setComments((prev) => [...(prev || []), { id: commentRef.id, content: text, timestamp: new Date() }]);
      setDraft('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `forum/${postId}/comments`);
      toast.error('Could not post your comment.');
    }
    setSending(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-warm-gray/40 space-y-2">
      {comments === null && <p className="text-[11px] text-rich-black/40">Loading comments…</p>}
      {comments && comments.length === 0 && (
        <p className="text-[11px] text-rich-black/40">No comments yet.</p>
      )}
      {comments?.map((c) => (
        <div key={c.id} className="bg-white rounded-xl px-3 py-2 border border-warm-gray/30">
          <p className="text-[11px] leading-snug text-rich-black/80 break-words whitespace-pre-line">{c.content}</p>
          <p className="text-[9px] text-rich-black/35 mt-0.5">{timeAgo(c.timestamp)}</p>
        </div>
      ))}

      <form onSubmit={handleSend} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
          placeholder="Add a comment…"
          className="flex-1 bg-white border border-warm-gray/60 focus:border-accent-gold rounded-full px-3.5 py-1.5 text-xs text-rich-black placeholder:text-rich-black/40 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-accent-gold disabled:opacity-30 transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
        >
          <span>Send</span>
          <Send size={11} />
        </button>
      </form>
    </div>
  );
}
