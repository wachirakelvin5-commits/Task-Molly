import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeAgo } from '../admin/src/timeAgo';

test('timeAgo', () => {
  const now = Date.UTC(2026, 9, 27, 12, 0);
  const ago = (ms: number) => new Date(now - ms);
  assert.equal(timeAgo(null, now), 'just now');
  assert.equal(timeAgo(ago(20 * 1000), now), 'just now');
  assert.equal(timeAgo(ago(5 * 60 * 1000), now), '5 min ago');
  assert.equal(timeAgo(ago(3 * 3600 * 1000), now), '3 h ago');
  assert.equal(timeAgo(ago(50 * 3600 * 1000), now), '2 d ago');
});
