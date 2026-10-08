/**
 * Security rules tests for the service request lifecycle.
 * Run with: npm run test:rules  (starts the Firestore emulator; needs Java)
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
const REQ = 'serviceRequests/req1';

const db = (uid?: string) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();

const newRequest = (clientId = 'alice', overrides: Record<string, any> = {}) => ({
  clientId,
  serviceType: 'Blocked Drain & Toilet Unclogging',
  serviceCategory: 'Plumbing & Water',
  description: 'Kitchen sink is blocked',
  location: 'Kilimani, Nairobi',
  budget: 2800,
  clientPrice: 2800,
  providerPrice: 2380,
  status: 'pending',
  createdAt: serverTimestamp(),
  postedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const stamp = (fields: Record<string, any>) => ({ ...fields, updatedAt: serverTimestamp() });

const accept = (uid: string) =>
  updateDoc(doc(db(uid), REQ), stamp({ status: 'accepted', providerId: uid, providerName: uid, acceptedAt: serverTimestamp() }));

/** Seeds REQ directly (bypassing rules) in the given state. */
async function seed(fields: Record<string, any>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), REQ), {
      ...newRequest(),
      createdAt: Timestamp.now(),
      postedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...fields,
    });
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-taskmolly',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    await setDoc(doc(fs, 'users/alice'), { uid: 'alice', email: 'a@x.com', role: 'client' });
    await setDoc(doc(fs, 'users/eve'), { uid: 'eve', email: 'e@x.com', role: 'client' });
    await setDoc(doc(fs, 'users/bob'), { uid: 'bob', email: 'b@x.com', role: 'tasker', services: ['Plumbing & Water'] });
    await setDoc(doc(fs, 'users/dave'), { uid: 'dave', email: 'd@x.com', role: 'tasker', services: ['Plumbing & Water', 'Repairs & Fundi'] });
    await setDoc(doc(fs, 'users/carol'), { uid: 'carol', email: 'c@x.com', role: 'tasker', services: ['Cleaning & Domestic'] });
  });
});

describe('creating requests', () => {
  test('a signed-in client can create their own pending request', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), REQ), newRequest()));
  });

  test('cannot create while signed out', async () => {
    await assertFails(setDoc(doc(db(), REQ), newRequest()));
  });

  test('cannot create on behalf of someone else', async () => {
    await assertFails(setDoc(doc(db('eve'), REQ), newRequest('alice')));
  });

  test('cannot skip ahead to a later status or pre-assign a provider', async () => {
    await assertFails(setDoc(doc(db('alice'), REQ), newRequest('alice', { status: 'assigned' })));
    await assertFails(setDoc(doc(db('alice'), REQ), newRequest('alice', { providerId: 'bob' })));
  });

  test('requires a known service category', async () => {
    await assertFails(setDoc(doc(db('alice'), REQ), newRequest('alice', { serviceCategory: 'Hairdressing' })));
  });

  test('cannot backdate timestamps', async () => {
    await assertFails(setDoc(doc(db('alice'), REQ), newRequest('alice', { createdAt: Timestamp.fromDate(new Date('2020-01-01')) })));
  });
});

describe('reading requests', () => {
  beforeEach(() => seed({}));

  test('the client and providers can see a pending request', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), REQ)));
    await assertSucceeds(getDoc(doc(db('bob'), REQ)));
  });

  test('other clients and signed-out visitors cannot', async () => {
    await assertFails(getDoc(doc(db('eve'), REQ)));
    await assertFails(getDoc(doc(db(), REQ)));
  });

  test("once accepted, only the client and that provider can see it", async () => {
    await seed({ status: 'accepted', providerId: 'bob', providerName: 'bob', acceptedAt: Timestamp.now() });
    await assertSucceeds(getDoc(doc(db('bob'), REQ)));
    await assertSucceeds(getDoc(doc(db('alice'), REQ)));
    await assertFails(getDoc(doc(db('dave'), REQ)));
  });

  test('the queries the dashboards run are allowed', async () => {
    await assertSucceeds(getDocs(query(collection(db('alice'), 'serviceRequests'), where('clientId', '==', 'alice'))));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'serviceRequests'),
      where('status', '==', 'pending'), where('serviceCategory', 'in', ['Plumbing & Water']))));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'serviceRequests'),
      where('providerId', '==', 'bob'), where('status', 'in', ['accepted', 'assigned']))));
  });

  test("a client cannot list someone else's requests", async () => {
    await assertFails(getDocs(query(collection(db('eve'), 'serviceRequests'), where('clientId', '==', 'alice'))));
  });
});

describe('full lifecycle', () => {
  test('request → accept → confirm → start → complete → client sign-off', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), REQ), newRequest()));
    await assertSucceeds(accept('bob'));
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ status: 'assigned', confirmedAt: serverTimestamp() })));
    await assertSucceeds(updateDoc(doc(db('bob'), REQ), stamp({ status: 'in-progress', startedAt: serverTimestamp() })));
    await assertSucceeds(updateDoc(doc(db('bob'), REQ), stamp({ status: 'awaiting-confirmation', providerCompletedAt: serverTimestamp() })));
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ issueReportedAt: serverTimestamp() })));
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ status: 'completed', completedAt: serverTimestamp() })));
  });
});

describe('provider acceptance', () => {
  beforeEach(() => seed({}));

  test("a provider outside the request's category cannot accept", async () => {
    await assertFails(accept('carol'));
  });

  test('a client cannot accept a request as a provider', async () => {
    await assertFails(accept('eve'));
  });

  test('cannot accept on behalf of another provider', async () => {
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({ status: 'accepted', providerId: 'dave', providerName: 'dave', acceptedAt: serverTimestamp() })));
  });

  test('a second provider cannot take an already accepted request', async () => {
    await assertSucceeds(accept('bob'));
    await assertFails(accept('dave'));
  });

  test('cannot accept an expired request until the client reposts it', async () => {
    const fourHoursAgo = Timestamp.fromMillis(Date.now() - 4 * 60 * 60 * 1000);
    await seed({ createdAt: fourHoursAgo, postedAt: fourHoursAgo });
    await assertFails(accept('bob'));
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ postedAt: serverTimestamp() })));
    await assertSucceeds(accept('bob'));
  });

  test('the provider can withdraw before the client confirms', async () => {
    await assertSucceeds(accept('bob'));
    await assertSucceeds(updateDoc(doc(db('bob'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
    })));
    await assertSucceeds(accept('dave'));
  });
});

describe('client confirmation of the provider', () => {
  beforeEach(() => seed({ status: 'accepted', providerId: 'bob', providerName: 'bob', acceptedAt: Timestamp.now() }));

  test('the provider cannot confirm themselves', async () => {
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({ status: 'assigned', confirmedAt: serverTimestamp() })));
  });

  test('another client cannot confirm', async () => {
    await assertFails(updateDoc(doc(db('eve'), REQ), stamp({ status: 'assigned', confirmedAt: serverTimestamp() })));
  });

  test('a rejected provider is not offered the request again', async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
      rejectedProviderIds: arrayUnion('bob'),
    })));
    await assertFails(accept('bob'));
    await assertSucceeds(accept('dave'));
  });

  test('rejecting must record the rejected provider', async () => {
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
    })));
  });
});

describe('doing and signing off the work', () => {
  test('only the assigned provider can start the job', async () => {
    await seed({ status: 'assigned', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('dave'), REQ), stamp({ status: 'in-progress', startedAt: serverTimestamp() })));
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ status: 'in-progress', startedAt: serverTimestamp() })));
  });

  test('the provider cannot complete the job without client sign-off', async () => {
    await seed({ status: 'in-progress', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({ status: 'completed', completedAt: serverTimestamp() })));
  });

  test('the provider cannot sign off their own work', async () => {
    await seed({ status: 'awaiting-confirmation', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({ status: 'completed', completedAt: serverTimestamp() })));
  });

  test('the client cannot sign off work that has not been marked done', async () => {
    await seed({ status: 'in-progress', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ status: 'completed', completedAt: serverTimestamp() })));
  });

  test('completed jobs cannot be edited', async () => {
    await seed({ status: 'completed', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ budget: 1 })));
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({ providerPrice: 99999 })));
  });
});

describe('editing and cancelling', () => {
  test('the client can edit and cancel while pending', async () => {
    await seed({});
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ description: 'Bathroom sink too', budget: 3000 })));
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ status: 'cancelled', cancelledAt: serverTimestamp() })));
  });

  test('the client can cancel after confirming, before work starts', async () => {
    await seed({ status: 'assigned', providerId: 'bob', providerName: 'bob' });
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({ status: 'cancelled', cancelledAt: serverTimestamp() })));
  });

  test('the client cannot cancel once work has started', async () => {
    await seed({ status: 'in-progress', providerId: 'bob', providerName: 'bob' });
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ status: 'cancelled', cancelledAt: serverTimestamp() })));
  });

  test('updates must carry a server timestamp', async () => {
    await seed({});
    await assertFails(updateDoc(doc(db('alice'), REQ), { description: 'no timestamp' }));
  });
});
