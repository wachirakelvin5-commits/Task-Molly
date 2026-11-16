import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidQuote, providerTakeHome, quotedPrice, takeHomeFor } from '../src/lib/requestModel';

test('a quote must be whole shillings, above zero, at most KES 1,000,000', () => {
  assert.equal(isValidQuote(2000), true);
  assert.equal(isValidQuote(1_000_000), true);
  assert.equal(isValidQuote(0), false);
  assert.equal(isValidQuote(-5), false);
  assert.equal(isValidQuote(2000.5), false);
  assert.equal(isValidQuote(1_000_001), false);
  assert.equal(isValidQuote(NaN), false);
});

test('an open request has no quoted price, even if an old price is stored', () => {
  assert.equal(quotedPrice({ clientPrice: 2800 }), null);
  assert.equal(quotedPrice({ providerId: 'bob', clientPrice: 2500 }), 2500);
});

test("the provider keeps the price less Task Molly's 15% fee", () => {
  assert.equal(takeHomeFor(2000), 1700);
  assert.equal(providerTakeHome({ providerId: 'bob', clientPrice: 2000 }), 1700);
  assert.equal(providerTakeHome({ clientPrice: 2000 }), null);
});

test('requests accepted before providers set prices keep their stored payout', () => {
  assert.equal(providerTakeHome({ providerId: 'bob', clientPrice: 2800, providerPrice: 2380 }), 2380);
});
