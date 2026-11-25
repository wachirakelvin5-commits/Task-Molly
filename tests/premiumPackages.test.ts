import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_PACKAGES, packageTotal, formatKes, estimateMonthly, estimateQuoteMinutes, formatDuration } from '../src/data/premiumPackages';
import { PROVIDER_LIST_SERVICES } from '../src/data/serviceCatalog';

test('every service (except Other) has a Premium package, in the service order', () => {
  assert.deepEqual(PREMIUM_PACKAGES.map((p) => p.service.id), PROVIDER_LIST_SERVICES.map((s) => s.id));
  for (const p of PREMIUM_PACKAGES) {
    assert.equal(p.title, `${p.service.name} Premium`);
    assert.ok(p.items.length >= 3, p.title);
    assert.ok(p.items.every((i) => Number.isInteger(i.monthly) && i.monthly >= 0), p.title);
  }
});

test('package total is the sum of its monthly charges', () => {
  const mamaFua = PREMIUM_PACKAGES.find((p) => p.service.id === 'mama_fua')!;
  assert.equal(packageTotal(mamaFua), 4800 + 2400 + 2000 + 1500);
  assert.equal(formatKes(10700), 'KES 10,700');
  assert.equal(formatKes(0), 'Included');
});

test('calculator: monthly estimate is the sum of picked items', () => {
  const mamaFua = PREMIUM_PACKAGES.find((p) => p.service.id === 'mama_fua')!;
  assert.equal(estimateMonthly(mamaFua, []), 0);
  assert.equal(estimateMonthly(mamaFua, ['Weekly wash & fold (up to 30 items)', 'Ironing add-on (weekly)']), 6800);
});

test('quote time grows with the job, and reads naturally', () => {
  assert.equal(estimateQuoteMinutes('mama_fua', 0, 0), 15);
  assert.equal(estimateQuoteMinutes('mama_fua', 2, 0), 25);
  assert.equal(estimateQuoteMinutes('indoor_cleaning', 1, 100), 45);
  assert.equal(estimateQuoteMinutes('security_cctv', 4, 300), 80);
  assert.equal(formatDuration(25), '25 minutes');
  assert.equal(formatDuration(60), '1 hour');
  assert.equal(formatDuration(80), '1 hour 20 min');
  assert.equal(formatDuration(120), '2 hours');
});
