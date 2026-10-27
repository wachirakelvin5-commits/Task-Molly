/**
 * Site analytics numbers (no emulator needed). Run with: npm run test:metrics
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { makePeriod } from '../src/lib/adminMetrics';
import {
  activeNow,
  communitySummary,
  normalizeEvent,
  normalizeForumPost,
  pageLabel,
  siteSummary,
} from '../src/lib/siteAnalytics';

const NOW = new Date(2026, 9, 27, 15, 0); // 27 Oct 2026, 15:00 local
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (msAgo: number) => new Date(NOW.getTime() - msAgo);

let seq = 0;
const ev = (data: Record<string, any>) => normalizeEvent(`e${++seq}`, { device: 'mobile', timestamp: at(HOUR), ...data });

// Today: visitor A (2 sessions), visitor B (1 bounce). Yesterday: visitor C.
const events = [
  ev({ type: 'page_view', page: '/', sessionId: 's1', visitorId: 'A', newSession: true, referrer: 'google.com', timestamp: at(3 * HOUR) }),
  ev({ type: 'page_exit', page: '/', sessionId: 's1', visitorId: 'A', durationMs: 40_000, timestamp: at(3 * HOUR - MIN) }),
  ev({ type: 'page_view', page: '/#Blog', sessionId: 's1', visitorId: 'A', timestamp: at(3 * HOUR - MIN) }),
  ev({ type: 'blog_view', page: '/blog/1', title: 'Choosing a plumber', sessionId: 's1', visitorId: 'A', timestamp: at(3 * HOUR - MIN) }),
  ev({ type: 'page_exit', page: '/#Blog', sessionId: 's1', visitorId: 'A', durationMs: 80_000, timestamp: at(3 * HOUR - 3 * MIN) }),
  ev({ type: 'page_view', page: '/request', sessionId: 's2', visitorId: 'A', newSession: true, referrer: 'direct', timestamp: at(HOUR) }),
  ev({ type: 'page_exit', page: '/request', sessionId: 's2', visitorId: 'A', durationMs: 60_000, timestamp: at(HOUR - MIN) }),
  ev({ type: 'page_view', page: '/', sessionId: 's3', visitorId: 'B', device: 'desktop', newSession: true, referrer: 'facebook.com', timestamp: at(2 * MIN) }),
  ev({ type: 'page_exit', page: '/', sessionId: 's3', visitorId: 'B', device: 'desktop', durationMs: 4_000, timestamp: at(MIN) }),
  ev({ type: 'page_view', page: '/', sessionId: 's4', visitorId: 'C', newSession: true, referrer: 'direct', timestamp: at(DAY) }),
];

describe('siteSummary', () => {
  const today = siteSummary(events, makePeriod('today', NOW));

  test('counts sessions, visitors and page views in the period only', () => {
    assert.equal(today.sessions, 3);
    assert.equal(today.visitors, 2);
    assert.equal(today.pageViews, 4);
    assert.equal(today.pagesPerSession, 4 / 3);
  });

  test('average time per session and bounce rate', () => {
    assert.equal(today.avgSessionMs, (120_000 + 60_000 + 4_000) / 3);
    // s2 saw one page but stayed a minute (not a bounce); s3 left after 4 s (bounce).
    assert.equal(today.bounceRate, 1 / 3);
  });

  test('devices, sources, pages and articles', () => {
    assert.deepEqual(today.devices.map((d) => [d.device, d.sessions]), [['mobile', 2], ['desktop', 1], ['tablet', 0]]);
    assert.deepEqual(
      today.sources.map((s) => `${s.source}:${s.sessions}`).sort(),
      ['direct:1', 'facebook.com:1', 'google.com:1'],
    );
    assert.equal(today.topPages[0].label, 'Home');
    assert.equal(today.topPages[0].count, 2);
    assert.equal(today.topPages[0].visitors, 2);
    assert.deepEqual(today.topArticles, [{ label: 'Choosing a plumber', count: 1, visitors: 1 }]);
  });

  test('today has 24 hourly buckets', () => {
    assert.equal(today.trend.length, 24);
    assert.equal(today.trend[12].label, '12:00');
    assert.equal(today.trend[12].pageViews, 2); // the two views at 12:00 and 12:01
    assert.equal(today.trend[14].visitors, 2); // A at 14:00, B at 14:58
  });

  test('7 days has daily buckets and includes yesterday', () => {
    const week = siteSummary(events, makePeriod('7d', NOW));
    assert.equal(week.trend.length, 7);
    assert.equal(week.visitors, 3);
  });

  test('no data gives empty numbers, not errors', () => {
    const empty = siteSummary([], makePeriod('today', NOW));
    assert.equal(empty.sessions, 0);
    assert.equal(empty.pagesPerSession, null);
    assert.equal(empty.bounceRate, null);
  });
});

test('activeNow counts visitors seen in the last 5 minutes', () => {
  assert.equal(activeNow(events, NOW.getTime()), 1);
});

test('pageLabel', () => {
  assert.equal(pageLabel('/'), 'Home');
  assert.equal(pageLabel('/#Get to Know Us'), 'Home › Get to Know Us');
  assert.equal(pageLabel('/something'), '/something');
});

test('communitySummary', () => {
  const posts = [
    normalizeForumPost('p1', { userId: 'u1', content: 'Hi', likes: 3, timestamp: at(HOUR) }),
    normalizeForumPost('p2', { userId: 'u2', content: 'Reply', likes: 0, replyToId: 'p1', timestamp: at(2 * HOUR) }),
    normalizeForumPost('p3', { userId: 'u1', content: 'Old', likes: 9, timestamp: at(3 * DAY) }),
  ];
  const c = communitySummary(posts, makePeriod('today', NOW));
  assert.equal(c.posts, 2);
  assert.equal(c.replies, 1);
  assert.equal(c.participants, 2);
  assert.equal(c.likes, 3);
  assert.deepEqual(c.mostLiked.map((p) => p.id), ['p1']);
});
