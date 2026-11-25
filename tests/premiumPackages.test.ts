import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_PACKAGES, packageTotal, formatKes } from '../src/data/premiumPackages';
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
