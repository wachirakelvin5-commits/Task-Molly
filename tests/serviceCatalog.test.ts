import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SERVICES_CATALOG, getCatalogServiceCategory } from '../src/data/serviceCatalog';
import { SERVICE_CATEGORIES, getServiceCategory } from '../src/lib/requestModel';

test('every catalogue service except "Other" is routed to a provider category', () => {
  for (const service of ALL_SERVICES_CATALOG) {
    const category = getCatalogServiceCategory(service);
    if (service.id === 'other') {
      assert.equal(category, undefined);
    } else {
      assert.ok(category && SERVICE_CATEGORIES.includes(category), `${service.name} has no category`);
    }
  }
});

test('catalogue services land with the providers who do that work', () => {
  const byId = (id: string) => getCatalogServiceCategory(ALL_SERVICES_CATALOG.find(s => s.id === id)!);
  assert.equal(byId('plumbing_repairs'), 'Plumbing & Water');
  assert.equal(byId('electrical_solar'), 'Electrical & Solar');
  assert.equal(byId('security_cctv'), 'Electrical & Solar');
  assert.equal(byId('moms_helper'), 'Cleaning & Domestic');
  assert.equal(byId('outdoor_services'), 'Outdoor & Relocation');
  assert.equal(byId('tv_mounting'), 'Repairs & Fundi');
});

test('"Other" requests are routed by the title the client types', () => {
  assert.equal(getServiceCategory('Swimming pool maintenance'), 'Outdoor & Relocation');
  assert.equal(getServiceCategory('Elderly parent care'), 'Cleaning & Domestic');
  assert.equal(getServiceCategory('Dog walking twice a week'), 'Cleaning & Domestic');
  assert.equal(getServiceCategory('Generator service'), 'Repairs & Fundi');
});

test('typed titles are not misfiled by words hidden inside other words', () => {
  assert.equal(getServiceCategory('Outdoor lighting'), 'Outdoor & Relocation');
  assert.equal(getServiceCategory('Outdoor Services'), 'Outdoor & Relocation');
  assert.equal(getServiceCategory('Carpet repair'), 'Repairs & Fundi');
  assert.equal(getServiceCategory('Pet sitting'), 'Cleaning & Domestic');
  assert.equal(getServiceCategory('Fix my front door'), 'Repairs & Fundi');
});
