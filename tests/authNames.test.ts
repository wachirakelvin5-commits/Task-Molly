import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameFromEmail } from '../src/lib/authNames';

test('a readable starting name from an email address', () => {
  assert.equal(nameFromEmail('kelvin.wachira@gmail.com'), 'Kelvin Wachira');
  assert.equal(nameFromEmail('grace_njeri+work@yahoo.com'), 'Grace Njeri');
  assert.equal(nameFromEmail('JOHN-doe254@mail.co.ke'), 'John Doe');
  assert.equal(nameFromEmail('12345@x.com'), 'Client');
  assert.equal(nameFromEmail(''), 'Client');
});
