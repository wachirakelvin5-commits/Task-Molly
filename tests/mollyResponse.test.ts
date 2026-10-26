import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMollyJson, partialMessage } from '../src/lib/mollyResponse';
import { MOLLY_SYSTEM_INSTRUCTION, mollyInstructionWithAvailability } from '../src/lib/mollyPrompt';

test('shows the part of Molly\'s message received so far while it streams', () => {
  assert.equal(partialMessage(''), null);
  assert.equal(partialMessage('{"mess'), null);
  assert.equal(partialMessage('{"message": "Hi! Which'), 'Hi! Which');
  assert.equal(partialMessage('{"message":"Hi there","serviceDetails":{'), 'Hi there');
});

test('streamed text keeps quotes, line breaks and escapes readable', () => {
  assert.equal(partialMessage('{"message": "Say \\"yes\\" to\\nproceed'), 'Say "yes" to\nproceed');
  // A chunk can end in the middle of an escape sequence.
  assert.equal(partialMessage('{"message": "KES 1,250 \\'), 'KES 1,250 ');
});

test('reads the final reply, with or without a ```json fence', () => {
  const reply = { message: 'Booked!', serviceDetails: { serviceType: 'Plumber', budget: 1250, isComplete: true } };
  assert.deepEqual(parseMollyJson(JSON.stringify(reply)), reply);
  assert.deepEqual(parseMollyJson('```json\n' + JSON.stringify(reply) + '\n```'), reply);
});

test('a reply without a message still gives the client something to read', () => {
  assert.equal(parseMollyJson('{"text": "Hello"}').message, 'Hello');
  assert.match(parseMollyJson('{}').message, /What service are you looking for/);
});

test('availability status is added to Molly\'s instructions only when known', () => {
  assert.equal(mollyInstructionWithAvailability(), MOLLY_SYSTEM_INSTRUCTION);
  assert.match(
    mollyInstructionWithAvailability('Plumber is currently busy. Next available in 2 hours.'),
    /CURRENT AVAILABILITY STATUS: Plumber is currently busy/,
  );
});
