import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTIMATE_MINUTES, checkBackTime } from '../src/lib/checkBackTime';

test('check-back time is the ask time + 30 minutes, in Kenya time', () => {
  assert.equal(ESTIMATE_MINUTES, 30);
  assert.equal(checkBackTime(new Date('2026-11-25T14:23:00Z')), '5:53 PM'); // asked 5:23 PM EAT
  assert.equal(checkBackTime(new Date('2026-11-25T20:45:00Z')), '12:15 AM'); // crosses midnight
  assert.equal(checkBackTime(new Date('2026-11-25T05:00:00Z')), '8:30 AM');
  assert.equal(checkBackTime(new Date('2026-11-25T08:45:00Z')), '12:15 PM'); // noon
  assert.equal(checkBackTime(new Date('2026-11-25T08:10:00Z'), 5), '11:15 AM');
});
