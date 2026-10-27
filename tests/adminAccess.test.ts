/**
 * Who gets into the admin website (admin/). Run with: npm run test:metrics
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedAdmin } from '../admin/src/access';

describe('isAllowedAdmin', () => {
  test('lets in the admin emails, in any letter case', () => {
    assert.equal(isAllowedAdmin({ email: 'taskmolly254@gmail.com', emailVerified: true }), true);
    assert.equal(isAllowedAdmin({ email: 'WachiraKelvin5@gmail.com', emailVerified: true }), true);
  });

  test('keeps out everyone else', () => {
    assert.equal(isAllowedAdmin({ email: 'someone@gmail.com', emailVerified: true }), false);
    assert.equal(isAllowedAdmin({ email: 'taskmolly254@gmail.com', emailVerified: false }), false);
    assert.equal(isAllowedAdmin({ email: null, emailVerified: true }), false);
    assert.equal(isAllowedAdmin(null), false);
  });
});
