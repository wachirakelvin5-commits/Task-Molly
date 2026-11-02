import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readConfig, isCollectionReady, isPayoutReady, normalizePhone, darajaTimestamp, toAmount, feeFor,
  stkPushBody, b2cBody, parseStkCallback, parseB2cResult,
} from '../server/mpesa';
import { RATE_CARD } from '../server/mpesaRateCard';

const TOKEN = 'x'.repeat(32);
const env = {
  MPESA_CONSUMER_KEY: 'key', MPESA_CONSUMER_SECRET: 'secret', MPESA_SHORTCODE: '174379', MPESA_PASSKEY: 'pass',
  MPESA_CALLBACK_BASE_URL: 'https://task-molly.example.run.app/', MPESA_CALLBACK_TOKEN: TOKEN,
};

describe('config', () => {
  test('off until every setting is there', () => {
    assert.equal(isCollectionReady(readConfig({})), false);
    assert.equal(isCollectionReady(readConfig({ ...env, MPESA_PASSKEY: '' })), false);
    assert.equal(isCollectionReady(readConfig({ ...env, MPESA_CALLBACK_TOKEN: 'short' })), false);
    assert.equal(isCollectionReady(readConfig({ ...env, MPESA_CALLBACK_BASE_URL: 'http://insecure' })), false);
    assert.equal(isCollectionReady(readConfig(env)), true);
    assert.equal(isPayoutReady(readConfig(env)), false);
    assert.equal(isPayoutReady(readConfig({ ...env, MPESA_B2C_INITIATOR_NAME: 'api', MPESA_B2C_SECURITY_CREDENTIAL: 'enc' })), true);
  });
  test('sandbox unless MPESA_ENV=production', () => {
    assert.equal(readConfig(env).baseUrl, 'https://sandbox.safaricom.co.ke');
    assert.equal(readConfig({ ...env, MPESA_ENV: 'production' }).baseUrl, 'https://api.safaricom.co.ke');
  });
});

describe('normalizePhone', () => {
  test('accepts the usual Kenyan formats', () => {
    for (const p of ['0712345678', '0712 345 678', '+254712345678', '254712345678', '712345678']) {
      assert.equal(normalizePhone(p), '254712345678', p);
    }
    assert.equal(normalizePhone('0112345678'), '254112345678');
  });
  test('rejects anything else', () => {
    for (const p of ['', '12345', '0812345678', '+1 555 123 4567', null, undefined, {}]) {
      assert.equal(normalizePhone(p as any), null, String(p));
    }
  });
});

test('timestamp is Kenya time', () => {
  assert.equal(darajaTimestamp(new Date('2026-11-02T21:30:05Z')), '20261103003005');
});

test('amounts are whole shillings within M-Pesa limits', () => {
  assert.equal(toAmount(1999.6), 2000);
  assert.equal(toAmount('KES 1,500'), 1500);
  assert.equal(toAmount(0), null);
  assert.equal(toAmount(-5), null);
  assert.equal(toAmount(300000), null);
  assert.equal(toAmount('abc'), null);
});

describe('feeFor', () => {
  test('percent rule: free band, percentage and cap', () => {
    const till = { kind: 'percent' as const, percent: 0.55, freeBelowKes: 500, capKes: 200 };
    assert.equal(feeFor(till, 499), 0);
    assert.equal(feeFor(till, 2000), 11);
    assert.equal(feeFor(till, 100000), 200);
  });
  test('band rule picks the right band', () => {
    const rule = { kind: 'bands' as const, bands: [{ minKes: 1, maxKes: 100, feeKes: 5 }, { minKes: 101, maxKes: 1500, feeKes: 15 }] };
    assert.equal(feeFor(rule, 100), 5);
    assert.equal(feeFor(rule, 101), 15);
    assert.equal(feeFor(rule, 5000), null);
  });
  test('the rate card is not guessed: unknown fees stay null', () => {
    assert.equal(feeFor(RATE_CARD.collection, 2000), null);
    assert.equal(feeFor(RATE_CARD.b2c, 2000), null);
  });
});

describe('request bodies', () => {
  const c = readConfig(env);
  test('STK push', () => {
    const body = stkPushBody(c, { amount: 2000, phone: '254712345678', paymentId: 'pay1', reference: 'TM128 NRB!', now: new Date('2026-11-02T21:30:05Z') });
    assert.equal(body.Timestamp, '20261103003005');
    assert.equal(Buffer.from(body.Password, 'base64').toString(), '174379pass20261103003005');
    assert.equal(body.PartyB, '174379');
    assert.equal(body.AccountReference, 'TM128NRB');
    assert.equal(body.CallBackURL, `https://task-molly.example.run.app/api/payment/stk-callback/${TOKEN}/pay1`);
  });
  test('B2C', () => {
    const body = b2cBody(readConfig({ ...env, MPESA_B2C_INITIATOR_NAME: 'api', MPESA_B2C_SECURITY_CREDENTIAL: 'enc' }), { amount: 1700, phone: '254712345678', payoutId: 'po1', remarks: 'x' });
    assert.equal(body.OriginatorConversationID, 'po1');
    assert.equal(body.CommandID, 'BusinessPayment');
    assert.equal(body.PartyA, '174379');
    assert.match(body.ResultURL, /\/api\/payment\/b2c-result\/x+\/po1$/);
    assert.match(body.QueueTimeOutURL, /\/api\/payment\/b2c-timeout\/x+\/po1$/);
  });
});

describe('callbacks', () => {
  test('successful STK callback', () => {
    const r = parseStkCallback({ Body: { stkCallback: {
      MerchantRequestID: 'm', CheckoutRequestID: 'ws_CO_1', ResultCode: 0, ResultDesc: 'ok',
      CallbackMetadata: { Item: [{ Name: 'Amount', Value: 2000 }, { Name: 'MpesaReceiptNumber', Value: 'QK12ABC' }, { Name: 'PhoneNumber', Value: 254712345678 }] },
    } } });
    assert.deepEqual(r, { checkoutRequestId: 'ws_CO_1', resultCode: 0, resultDesc: 'ok', amount: 2000, receipt: 'QK12ABC' });
  });
  test('cancelled STK callback has no receipt', () => {
    const r = parseStkCallback({ Body: { stkCallback: { CheckoutRequestID: 'ws_CO_2', ResultCode: 1032, ResultDesc: 'Request cancelled by user' } } });
    assert.equal(r?.resultCode, 1032);
    assert.equal(r?.receipt, null);
    assert.equal(r?.amount, null);
  });
  test('junk is ignored', () => {
    assert.equal(parseStkCallback({}), null);
    assert.equal(parseB2cResult({ hello: 1 }), null);
  });
  test('B2C result', () => {
    const r = parseB2cResult({ Result: {
      ResultType: 0, ResultCode: 0, ResultDesc: 'done', OriginatorConversationID: 'po1', ConversationID: 'AG_1', TransactionID: 'QK34XYZ',
      ResultParameters: { ResultParameter: [{ Key: 'TransactionAmount', Value: 1700 }, { Key: 'TransactionReceipt', Value: 'QK34XYZ' }] },
    } });
    assert.deepEqual(r, { conversationId: 'AG_1', originatorConversationId: 'po1', resultCode: 0, resultDesc: 'done', transactionId: 'QK34XYZ', amount: 1700 });
  });
});
