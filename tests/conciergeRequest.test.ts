import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConciergeRequest, tasksLink, CONCIERGE_SERVICE } from '../src/lib/conciergeRequest';
import { SERVICE_CATEGORIES } from '../src/lib/requestModel';

test('concierge request carries the notes, the Premium label and a routable category', () => {
  const r = buildConciergeRequest('  Weekly help on Saturdays  ', new Date('2026-11-26T10:00:00Z'));
  assert.equal(r.serviceType, CONCIERGE_SERVICE);
  assert.equal(r.description, 'Premium Requests (a month +)\n\nWeekly help on Saturdays');
  assert.ok((SERVICE_CATEGORIES as readonly string[]).includes(r.serviceCategory));
  assert.ok(!('clientId' in r) && !('status' in r));
  assert.ok(buildConciergeRequest('x'.repeat(5000)).description.length <= 2000);
});

test('Go to tasks & requests: signed out goes through sign-up, then to the task list', () => {
  assert.equal(tasksLink(true), '/tasks');
  assert.equal(tasksLink(false), '/auth?mode=signup&redirect=/tasks');
});
