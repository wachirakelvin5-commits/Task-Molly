import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SERVICES_CATALOG, REQUEST_SERVICES, PROVIDER_LIST_SERVICES, getCatalogServiceCategory, findService } from '../src/data/serviceCatalog';
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

test('the Request tab lists services in the owner\'s order, with Other last', () => {
  assert.deepEqual(REQUEST_SERVICES.map((s) => s.id), [
    'errand_runner', 'shopping', 'grocery_shopping', 'mama_fua', 'carpet_sofa_cleaning', 'laundry_ironing',
    'indoor_cleaning', 'cook_meal', 'plumbing_repairs', 'electrical_solar', 'fundi_handyman', 'carpenter',
    'appliance_repair', 'tv_mounting', 'movers_relocation', 'pest_control', 'gardening_landscaping',
    'security_cctv', 'house_painting', 'airbnb_cleaning', 'dog_walking', 'elder_care', 'moms_helper',
    'driver', 'gas', 'internet_installation', 'makeup_professional', 'other',
  ]);
  assert.equal(PROVIDER_LIST_SERVICES.length, REQUEST_SERVICES.length - 1);
  assert.ok(!PROVIDER_LIST_SERVICES.some((s) => s.id === 'other'));
});

test('new services reach providers who do that work', () => {
  const byId = (id: string) => getCatalogServiceCategory(findService(id)!);
  assert.equal(byId('shopping'), 'Outdoor & Relocation');
  assert.equal(byId('grocery_shopping'), 'Outdoor & Relocation');
  assert.equal(byId('driver'), 'Outdoor & Relocation');
  assert.equal(byId('internet_installation'), 'Outdoor & Relocation');
  assert.equal(byId('carpenter'), 'Repairs & Fundi');
  assert.equal(byId('gas'), 'Repairs & Fundi');
  assert.equal(byId('makeup_professional'), 'Cleaning & Domestic');
});

test('retired services are not listed but saved ids still resolve', () => {
  for (const id of ['outdoor_services', 'office_cleaning', 'moving_cleaning', 'express_cleaning', 'extra_care', 'car_wash']) {
    assert.ok(findService(id), id);
    assert.ok(!REQUEST_SERVICES.some((s) => s.id === id), id);
  }
  assert.equal(new Set(ALL_SERVICES_CATALOG.map((s) => s.id)).size, ALL_SERVICES_CATALOG.length);
});

test('list-style services get their own first box', () => {
  assert.equal(findService('shopping')!.descriptionPrompt, 'Type your list');
  assert.equal(findService('grocery_shopping')!.descriptionPrompt, 'Type your list');
  assert.equal(findService('errand_runner')!.descriptionPrompt, 'List your errands');
  assert.equal(findService('indoor_cleaning')!.descriptionPrompt, undefined);
});
