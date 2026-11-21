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
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildRandomComment, buildRandomPost, generateRandomId } from '../src/lib/randomPosts';

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

/** The provider takes the request at their own price; any old payout figure is cleared. */
const accept = (uid: string, price: any = 2500) =>
  updateDoc(doc(db(uid), REQ), stamp({
    status: 'accepted', providerId: uid, providerName: uid, acceptedAt: serverTimestamp(),
    clientPrice: price, providerPrice: deleteField(),
  }));

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

  test('the provider must set a whole-shilling price when accepting', async () => {
    await assertFails(accept('bob', 0));
    await assertFails(accept('bob', -500));
    await assertFails(accept('bob', 2500.5));
    await assertFails(accept('bob', 2_000_000));
    await assertFails(accept('bob', '2500'));
    await assertSucceeds(accept('bob', 3200));
  });

  test('the provider cannot set their own payout when accepting', async () => {
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({
      status: 'accepted', providerId: 'bob', providerName: 'bob', acceptedAt: serverTimestamp(),
      clientPrice: 2500, providerPrice: 2500,
    })));
  });

  test("withdrawing clears the provider's price", async () => {
    await assertSucceeds(accept('bob'));
    await assertFails(updateDoc(doc(db('bob'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
      clientPrice: 1,
    })));
    await assertSucceeds(updateDoc(doc(db('bob'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
      clientPrice: deleteField(), providerPrice: deleteField(),
    })));
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

  test("the client cannot change the provider's price when confirming", async () => {
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ status: 'assigned', confirmedAt: serverTimestamp(), clientPrice: 100 })));
  });

  test("rejecting can clear the rejected provider's price", async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), REQ), stamp({
      status: 'pending', providerId: deleteField(), providerName: deleteField(), acceptedAt: deleteField(),
      clientPrice: deleteField(), providerPrice: deleteField(), rejectedProviderIds: arrayUnion('bob'),
    })));
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

  test('the client cannot set the price: the provider does', async () => {
    await seed({});
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ clientPrice: 100 })));
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ providerPrice: 100 })));
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

describe('admin access and roles', () => {
  const asEmail = (uid: string, email: string, verified = true) =>
    env.authenticatedContext(uid, { email, email_verified: verified }).firestore();

  beforeEach(() => seed({}));

  test('both admin accounts can read any request', async () => {
    await assertSucceeds(getDoc(doc(asEmail('admin1', 'wachirakelvin5@gmail.com'), REQ)));
    await assertSucceeds(getDoc(doc(asEmail('admin2', 'taskmolly254@gmail.com'), REQ)));
  });

  test('other or unverified emails are not admins', async () => {
    await assertFails(getDoc(doc(asEmail('mallory', 'mallory@example.com'), REQ)));
    await assertFails(getDoc(doc(asEmail('admin2', 'taskmolly254@gmail.com', false), REQ)));
  });

  test('new users can sign up as a client or provider, but not make themselves admin', async () => {
    const profile = (uid: string, role: string) => ({ uid, email: `${uid}@example.com`, role });
    await assertSucceeds(setDoc(doc(db('newclient'), 'users/newclient'), profile('newclient', 'client')));
    await assertSucceeds(setDoc(doc(db('newpro'), 'users/newpro'), profile('newpro', 'tasker')));
    await assertFails(setDoc(doc(db('sneaky'), 'users/sneaky'), profile('sneaky', 'admin')));
  });
});

describe('task chat', () => {
  const MSGS = `${REQ}/messages`;
  const msg = (uid: string, senderRole: string, extra: Record<string, any> = {}) => ({
    senderId: uid,
    senderRole,
    senderName: uid,
    text: 'Gate code is 1234',
    timestamp: serverTimestamp(),
    ...extra,
  });
  const send = (uid: string, senderRole: string, extra?: Record<string, any>) =>
    addDoc(collection(db(uid), MSGS), msg(uid, senderRole, extra));
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();

  beforeEach(() => seed({ status: 'assigned', providerId: 'bob', providerName: 'Bob' }));

  test('the client and the provider can message each other and read the thread', async () => {
    await assertSucceeds(send('alice', 'client'));
    await assertSucceeds(send('bob', 'provider'));
    await assertSucceeds(getDocs(collection(db('alice'), MSGS)));
    await assertSucceeds(getDocs(collection(db('bob'), MSGS)));
  });

  test('admins can read the thread', async () => {
    await assertSucceeds(send('alice', 'client'));
    await assertSucceeds(getDocs(collection(admin(), MSGS)));
  });

  test('anyone else can neither read nor write', async () => {
    await assertFails(getDocs(collection(db('eve'), MSGS)));
    await assertFails(getDocs(collection(db(), MSGS)));
    await assertFails(send('eve', 'client'));
  });

  test('cannot pose as the other side or someone else', async () => {
    await assertFails(send('alice', 'provider'));
    await assertFails(send('bob', 'client'));
    await assertFails(addDoc(collection(db('alice'), MSGS), msg('bob', 'provider')));
  });

  test('messages must be valid and server-timestamped', async () => {
    await assertFails(send('alice', 'client', { text: '' }));
    await assertFails(send('alice', 'client', { text: 'x'.repeat(1001) }));
    await assertFails(send('alice', 'client', { timestamp: Timestamp.fromMillis(0) }));
    await assertFails(send('alice', 'client', { extra: 'field' }));
  });

  test('messages cannot be edited or deleted, even by admins', async () => {
    let id = '';
    await env.withSecurityRulesDisabled(async (ctx) => {
      id = (await addDoc(collection(ctx.firestore(), MSGS), { ...msg('alice', 'client'), timestamp: Timestamp.now() })).id;
    });
    await assertFails(updateDoc(doc(db('alice'), MSGS, id), { text: 'changed' }));
    await assertFails(deleteDoc(doc(db('alice'), MSGS, id)));
    await assertFails(deleteDoc(doc(admin(), MSGS, id)));
  });

  test('no messages before a provider takes the task or after it closes', async () => {
    await seed({ status: 'pending' });
    await assertFails(send('alice', 'client'));
    await seed({ status: 'completed', providerId: 'bob', providerName: 'Bob' });
    await assertFails(send('alice', 'client'));
    await assertFails(send('bob', 'provider'));
    // ...but the thread can still be read afterwards.
    await assertSucceeds(getDocs(collection(db('alice'), MSGS)));
  });
});

describe('M-Pesa payments and payouts', () => {
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      await setDoc(doc(fs, 'payments/pay1'), { requestId: 'req1', clientId: 'alice', providerId: 'bob', amount: 2800, status: 'paid' });
      await setDoc(doc(fs, 'payouts/po1'), { requestId: 'req1', providerId: 'bob', amount: 2380, status: 'paid' });
    });
  });

  test('each side reads only their own record; admins read both', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'payments/pay1')));
    await assertFails(getDoc(doc(db('eve'), 'payments/pay1')));
    await assertFails(getDoc(doc(db('bob'), 'payments/pay1')));
    await assertSucceeds(getDoc(doc(db('bob'), 'payouts/po1')));
    await assertFails(getDoc(doc(db('alice'), 'payouts/po1')));
    await assertSucceeds(getDoc(doc(admin(), 'payments/pay1')));
    await assertSucceeds(getDoc(doc(admin(), 'payouts/po1')));
  });

  test('nobody can create or change them from the app, not even admins', async () => {
    await assertFails(setDoc(doc(db('alice'), 'payments/fake'), { clientId: 'alice', amount: 1, status: 'paid' }));
    await assertFails(updateDoc(doc(db('alice'), 'payments/pay1'), { status: 'failed' }));
    await assertFails(setDoc(doc(db('bob'), 'payouts/fake'), { providerId: 'bob', amount: 99999, status: 'paid' }));
    await assertFails(updateDoc(doc(admin(), 'payouts/po1'), { amount: 1 }));
  });

  test('a client cannot mark their own task as paid', async () => {
    await seed({ status: 'completed', providerId: 'bob', providerName: 'Bob' });
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ paymentStatus: 'paid' })));
    await seed({ status: 'pending' });
    await assertFails(updateDoc(doc(db('alice'), REQ), stamp({ description: 'x', paymentStatus: 'paid' })));
  });
});

describe('user records are private', () => {
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();
  const taskers = (fs: any) => query(collection(fs, 'users'), where('role', '==', 'tasker'));

  test('signed-out visitors cannot list or read provider records', async () => {
    await assertFails(getDocs(taskers(db())));
    await assertFails(getDoc(doc(db(), 'users/bob')));
  });

  test("signed-in users cannot read or list anyone else's record", async () => {
    await assertFails(getDoc(doc(db('alice'), 'users/bob')));
    await assertFails(getDoc(doc(db('bob'), 'users/alice')));
    await assertFails(getDocs(taskers(db('alice'))));
  });

  test('owners and admins can', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'users/bob')));
    await assertSucceeds(getDoc(doc(admin(), 'users/bob')));
    await assertSucceeds(getDocs(taskers(admin())));
  });

  test('owners can still edit their own details', async () => {
    await assertSucceeds(updateDoc(doc(db('bob'), 'users/bob'), { displayName: 'Bob K', phone: '0700', isOnline: true, fcmToken: 't' }));
  });
});

describe('providers cannot verify themselves', () => {
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();
  const submission = (uid: string, overrides: Record<string, any> = {}) => ({
    uid,
    serviceId: 'plumber',
    serviceName: 'Plumber',
    status: 'pending',
    submittedAt: new Date().toISOString(),
    selfie: { dataUrl: 'data:image/jpeg;base64,AAAA' },
    ...overrides,
  });

  test('a provider cannot add service categories to their own record', async () => {
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { services: ['Plumbing & Water', 'Electrical & Solar'] }));
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { services: ['Electrical & Solar'] }));
  });

  test('a provider can drop a category they have', async () => {
    await assertSucceeds(updateDoc(doc(db('dave'), 'users/dave'), { services: ['Repairs & Fundi'] }));
  });

  test('a provider cannot mark themselves verified or change their wallet', async () => {
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { isVerified: true }));
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { walletBalance: 999999 }));
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { 'serviceVerifications.plumber.status': 'verified' }));
  });

  test('new accounts cannot start with categories', async () => {
    await assertFails(setDoc(doc(db('newpro'), 'users/newpro'), { uid: 'newpro', email: 'n@x.com', role: 'tasker', services: ['Plumbing & Water'] }));
  });

  test('an admin can grant categories', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'users/bob'), { services: arrayUnion('Electrical & Solar') }));
  });

  test('a provider can submit documents for review, only as pending', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), submission('bob')));
    await assertFails(setDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), submission('bob', { status: 'verified' })));
    await assertFails(setDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), submission('bob', { reviewedAt: 'now' })));
  });

  test("a provider cannot submit for someone else or under another id", async () => {
    await assertFails(setDoc(doc(db('bob'), 'providerVerifications/carol_plumber'), submission('carol')));
    await assertFails(setDoc(doc(db('bob'), 'providerVerifications/bob_other'), submission('bob')));
  });

  test('only the provider and admins can read verification documents', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), submission('bob')));
    await assertSucceeds(getDoc(doc(db('bob'), 'providerVerifications/bob_plumber')));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'providerVerifications'), where('uid', '==', 'bob'))));
    await assertSucceeds(getDocs(collection(admin(), 'providerVerifications')));
    await assertFails(getDoc(doc(db('alice'), 'providerVerifications/bob_plumber')));
    await assertFails(getDoc(doc(db(), 'providerVerifications/bob_plumber')));
    await assertFails(getDocs(collection(db('carol'), 'providerVerifications')));
  });

  test('only an admin can approve', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), submission('bob')));
    await assertFails(updateDoc(doc(db('bob'), 'providerVerifications/bob_plumber'), { status: 'verified' }));
    await assertSucceeds(updateDoc(doc(admin(), 'providerVerifications/bob_plumber'), { status: 'verified', reviewedAt: 'now', reviewedBy: 'admin' }));
  });
});

describe('public provider profiles', () => {
  const profile = (uid: string, overrides: Record<string, any> = {}) => ({
    uid, name: uid, photo: '', services: ['Plumbing & Water'], isOnline: true, updatedAt: serverTimestamp(), ...overrides,
  });

  test('anyone can read them', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'providerProfiles/bob'), profile('bob')));
    await assertSucceeds(getDocs(query(collection(db(), 'providerProfiles'), where('isOnline', '==', true))));
  });

  test('a provider can publish their own, with only the categories they were granted', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'providerProfiles/bob'), profile('bob')));
    await assertFails(setDoc(doc(db('bob'), 'providerProfiles/bob'), profile('bob', { services: ['Plumbing & Water', 'Electrical & Solar'] })));
  });

  test('no private fields, and not for someone else or a client', async () => {
    await assertFails(setDoc(doc(db('bob'), 'providerProfiles/bob'), profile('bob', { phone: '0700' })));
    await assertFails(setDoc(doc(db('bob'), 'providerProfiles/carol'), profile('carol', { services: ['Cleaning & Domestic'] })));
    await assertFails(setDoc(doc(db('alice'), 'providerProfiles/alice'), profile('alice', { services: [] })));
  });
});

describe('old analytics events (visits now counted by Cloudflare)', () => {
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();
  const event = {
    type: 'page_view', page: '/', sessionId: 'a1b2c3d4e5f6a7b8', visitorId: '0123456789abcdef',
    device: 'mobile', signedIn: false, timestamp: serverTimestamp(),
  };

  test('nobody can write them any more, signed in or not, not even admins', async () => {
    await assertFails(addDoc(collection(db(), 'analytics'), event));
    await assertFails(addDoc(collection(db('alice'), 'analytics'), event));
    await assertFails(addDoc(collection(admin(), 'analytics'), event));
  });

  test('admins can still read the history; nobody else can', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'analytics/e1'), { ...event, timestamp: Timestamp.now() });
    });
    await assertSucceeds(getDocs(collection(admin(), 'analytics')));
    await assertFails(getDocs(collection(db('alice'), 'analytics')));
    await assertFails(getDocs(collection(db(), 'analytics')));
  });
});

describe('unlisted service requests', () => {
  test('nobody can write them from the app (server.ts writes them with admin access)', async () => {
    const req = { email: 'a@x.com', serviceType: 'Dog walking' };
    await assertFails(addDoc(collection(db(), 'unlistedServiceRequests'), req));
    await assertFails(addDoc(collection(db('alice'), 'unlistedServiceRequests'), req));
  });
});

describe('complaints', () => {
  // Same shape as src/components/ComplaintModal.tsx sends.
  const complaint = (overrides: Record<string, any> = {}) => ({
    taskId: 'req1',
    reporterId: 'alice',
    reporterRole: 'client',
    targetId: 'bob',
    reason: 'Unsatisfactory Service',
    comment: 'c'.repeat(350),
    status: 'new',
    timestamp: serverTimestamp(),
    ...overrides,
  });
  const file = (uid: string | undefined, data: Record<string, any>) => addDoc(collection(db(uid), 'complaints'), data);

  test('a signed-in user can file one as themselves', async () => {
    await assertSucceeds(file('alice', complaint()));
    await assertSucceeds(file('bob', complaint({ reporterId: 'bob', reporterRole: 'tasker', targetId: 'alice', reason: 'Abusive Customer' })));
  });

  test('not signed out, not as someone else, and no extra or oversized fields', async () => {
    await assertFails(file(undefined, complaint()));
    await assertFails(file('eve', complaint()));
    await assertFails(file('alice', complaint({ comment: 'c'.repeat(1001) })));
    await assertFails(file('alice', complaint({ status: 'completed' })));
    await assertFails(file('alice', complaint({ attachment: 'x' })));
  });
});

describe('randoms (forum)', () => {
  // The same records src/components/RandomFeed.tsx sends, built by the same code.
  const post = (uid: string | undefined, id = generateRandomId(), overrides: Record<string, any> = {}) =>
    setDoc(doc(db(uid), 'forum', id), { ...buildRandomPost(id, 'Anyone else love rainy Sundays?', serverTimestamp()), ...overrides });
  const comment = (uid: string | undefined, postId: string, overrides: Record<string, any> = {}) => {
    const d = db(uid);
    const batch = writeBatch(d);
    batch.set(doc(collection(d, 'forum', postId, 'comments')), { ...buildRandomComment('Same here!', serverTimestamp()), ...overrides });
    batch.update(doc(d, 'forum', postId), { commentCount: increment(1) });
    return batch.commit();
  };
  const OLD = 'forum/oldpost1';

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'forum/abcd1234'), buildRandomPost('abcd1234', 'Hello', Timestamp.now()));
      // A post from before Randoms (old shape, no hates or comment count).
      await setDoc(doc(ctx.firestore(), OLD), { userId: 'alice', content: 'Hello', likes: 3 });
    });
  });

  test('anyone can post a Random, with or without an account, and anyone can read it', async () => {
    await assertSucceeds(post(undefined, 'xyd4954y'));
    await assertSucceeds(post('alice', 'abc12345'));
    await assertSucceeds(getDoc(doc(db(), 'forum/xyd4954y')));
  });

  test('a Random stores nothing about the person, and its ID is unique', async () => {
    await assertFails(post('alice', generateRandomId(), { userId: 'alice' }));
    await assertFails(post('alice', generateRandomId(), { userName: 'Alice' }));
    await assertFails(post('alice', 'XYD4954Y', { randomId: 'XYD4954Y' }));
    await assertFails(post('alice', 'short1', { randomId: 'short1' }));
    await assertFails(post('alice', 'aaaa1111', { randomId: 'bbbb2222' }));
    // Taking an existing ID would overwrite that Random: refused.
    await assertFails(post('bob', 'abcd1234'));
  });

  test('no oversized, empty, pre-liked or back-dated Randoms', async () => {
    await assertFails(post('alice', generateRandomId(), { content: 'x'.repeat(1001) }));
    await assertFails(post('alice', generateRandomId(), { content: '' }));
    await assertFails(post('alice', generateRandomId(), { likes: 500 }));
    await assertFails(post('alice', generateRandomId(), { hates: 1 }));
    await assertFails(post('alice', generateRandomId(), { commentCount: 9 }));
    await assertFails(post('alice', generateRandomId(), { timestamp: Timestamp.fromMillis(0) }));
  });

  test('likes and hates move by one, including switching between them', async () => {
    const R = 'forum/abcd1234';
    await assertSucceeds(updateDoc(doc(db('eve'), R), { likes: increment(1) }));
    await assertSucceeds(updateDoc(doc(db('eve'), R), { likes: increment(-1), hates: increment(1) }));
    await assertSucceeds(updateDoc(doc(db('eve'), R), { hates: increment(-1) }));
    await assertSucceeds(updateDoc(doc(db('eve'), OLD), { hates: increment(1) }));
    await assertSucceeds(updateDoc(doc(db('eve'), OLD), { likes: increment(-1) }));
    // No account needed to react.
    await assertSucceeds(updateDoc(doc(db(), R), { likes: increment(1) }));
    await assertSucceeds(updateDoc(doc(db(), R), { likes: increment(-1), hates: increment(1) }));
  });

  test('counts cannot jump, go negative or come with other edits, and Randoms cannot be deleted', async () => {
    const R = 'forum/abcd1234';
    await assertFails(updateDoc(doc(db('eve'), R), { likes: increment(5) }));
    await assertFails(updateDoc(doc(db('eve'), R), { hates: -1 }));
    await assertFails(updateDoc(doc(db('eve'), R), { commentCount: increment(-1) }));
    await assertFails(updateDoc(doc(db('eve'), R), { likes: increment(1), content: 'edited' }));
    await assertFails(updateDoc(doc(db(), R), { likes: increment(3) }));
    await assertFails(updateDoc(doc(db(), R), { content: 'edited' }));
    await assertFails(deleteDoc(doc(db('alice'), R)));
    await assertFails(deleteDoc(doc(db(), R)));
  });

  test('anyone can comment, with or without an account, and anyone can read comments', async () => {
    await assertSucceeds(comment(undefined, 'abcd1234'));
    await assertSucceeds(comment('eve', 'abcd1234'));
    await assertSucceeds(comment('eve', 'oldpost1'));
    await assertSucceeds(getDocs(collection(db(), 'forum', 'abcd1234', 'comments')));
  });

  test('comments: not on missing Randoms, nothing about the person, no edits or deletes', async () => {
    await assertFails(comment(undefined, 'nopost99'));
    await assertFails(comment('eve', 'nopost99'));
    await assertFails(comment(undefined, 'abcd1234', { userId: 'anon' }));
    await assertFails(comment('eve', 'abcd1234', { userId: 'eve' }));
    await assertFails(comment('eve', 'abcd1234', { content: 'x'.repeat(501) }));
    await assertFails(comment('eve', 'abcd1234', { content: '' }));
  });
});

describe('Random is the only place that works without an account', () => {
  test('signed-out visitors still cannot write anywhere else', async () => {
    const anon = db();
    await assertFails(setDoc(doc(anon, 'users/anon'), { name: 'x' }));
    await assertFails(addDoc(collection(anon, 'serviceRequests'), { title: 'x' }));
    await assertFails(addDoc(collection(anon, 'complaints'), { text: 'x' }));
    await assertFails(addDoc(collection(anon, 'unlistedServiceRequests'), { text: 'x' }));
    await assertFails(addDoc(collection(anon, 'analytics'), { path: '/' }));
    await assertFails(setDoc(doc(anon, 'providerProfiles/anon'), { name: 'x' }));
    await assertFails(setDoc(doc(anon, 'jobs/anon'), { title: 'x' }));
    await assertFails(setDoc(doc(anon, 'taskerProfiles/anon'), { name: 'x' }));
    await assertFails(addDoc(collection(anon, 'providerVerifications'), { a: 1 }));
    await assertFails(addDoc(collection(anon, 'payments'), { a: 1 }));
    await assertFails(addDoc(collection(anon, 'payouts'), { a: 1 }));
    await assertFails(addDoc(collection(anon, 'notifications'), { a: 1 }));
    await assertFails(addDoc(collection(anon, 'serviceRequests', 'req1', 'messages'), { text: 'x' }));
    await assertFails(addDoc(collection(anon, 'somethingNew'), { a: 1 }));
    // Only `comments` is open under a Random, nothing else.
    await assertFails(addDoc(collection(anon, 'forum', 'abcd1234', 'other'), { content: 'x' }));
  });
});

describe('old jobs collection (not used by the app)', () => {
  const admin = () => env.authenticatedContext('admin1', { email: 'wachirakelvin5@gmail.com', email_verified: true }).firestore();
  const job = { clientId: 'alice', taskerId: 'bob', status: 'assigned' };

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'jobs/job1'), job);
      await setDoc(doc(ctx.firestore(), 'jobs/job1/messages/m1'), { senderId: 'alice', text: 'hi' });
    });
  });

  test('nobody can create, change or delete jobs from the app, not even admins', async () => {
    await assertFails(setDoc(doc(db('alice'), 'jobs/new1'), job));
    await assertFails(setDoc(doc(db(), 'jobs/new2'), job));
    await assertFails(updateDoc(doc(db('alice'), 'jobs/job1'), { status: 'completed' }));
    await assertFails(updateDoc(doc(db('bob'), 'jobs/job1'), { status: 'completed' }));
    await assertFails(deleteDoc(doc(db('alice'), 'jobs/job1')));
    await assertFails(setDoc(doc(admin(), 'jobs/new3'), job));
  });

  test('nobody can add messages to a job', async () => {
    await assertFails(setDoc(doc(db('alice'), 'jobs/job1/messages/m2'), { senderId: 'alice', text: 'x' }));
    await assertFails(setDoc(doc(db('bob'), 'jobs/job1/messages/m3'), { senderId: 'bob', text: 'x' }));
  });

  test('only admins can read what is already there', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'jobs/job1')));
    await assertSucceeds(getDoc(doc(admin(), 'jobs/job1/messages/m1')));
    await assertFails(getDoc(doc(db('alice'), 'jobs/job1')));
    await assertFails(getDoc(doc(db('bob'), 'jobs/job1')));
    await assertFails(getDoc(doc(db('alice'), 'jobs/job1/messages/m1')));
    await assertFails(getDoc(doc(db(), 'jobs/job1')));
  });
});
