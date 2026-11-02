// M-Pesa Daraja client: STK push (client pays) and B2C (Task Molly pays a provider).
// Everything is read from environment variables (Cloud Run settings / Secret Manager), never the repo.
// Until the variables are set, isCollectionReady / isPayoutReady return false and the routes answer 503.

import { RATE_CARD, type FeeRule } from './mpesaRateCard.ts';

export type MpesaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  /** Paybill number, or the store (head office) number for a Till. */
  shortcode: string;
  passkey: string;
  /** CustomerPayBillOnline for a Paybill, CustomerBuyGoodsOnline for a Till. */
  transactionType: string;
  /** Who receives the money: the Paybill (same as shortcode) or the Till number. */
  partyB: string;
  /** Public address of server.ts on Cloud Run, e.g. https://task-molly-xxxx.run.app */
  callbackBaseUrl: string;
  /** Random secret placed in callback URLs so only Safaricom (who got the URL) can reach them. */
  callbackToken: string;
  b2cShortcode: string;
  b2cInitiatorName: string;
  /** Initiator password encrypted with Safaricom's certificate (made in the Daraja portal). */
  b2cSecurityCredential: string;
};

export function readConfig(env: Record<string, string | undefined> = process.env): MpesaConfig {
  const production = (env.MPESA_ENV || 'sandbox').toLowerCase() === 'production';
  const shortcode = env.MPESA_SHORTCODE || '';
  return {
    baseUrl: production ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
    consumerKey: env.MPESA_CONSUMER_KEY || '',
    consumerSecret: env.MPESA_CONSUMER_SECRET || '',
    shortcode,
    passkey: env.MPESA_PASSKEY || '',
    transactionType: env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
    partyB: env.MPESA_PARTY_B || shortcode,
    callbackBaseUrl: (env.MPESA_CALLBACK_BASE_URL || '').replace(/\/+$/, ''),
    callbackToken: env.MPESA_CALLBACK_TOKEN || '',
    b2cShortcode: env.MPESA_B2C_SHORTCODE || shortcode,
    b2cInitiatorName: env.MPESA_B2C_INITIATOR_NAME || '',
    b2cSecurityCredential: env.MPESA_B2C_SECURITY_CREDENTIAL || '',
  };
}

function hasCommon(c: MpesaConfig): boolean {
  return !!(c.consumerKey && c.consumerSecret && c.callbackBaseUrl.startsWith('https://') && c.callbackToken.length >= 24);
}

export function isCollectionReady(c: MpesaConfig): boolean {
  return hasCommon(c) && !!(c.shortcode && c.passkey && c.partyB);
}

export function isPayoutReady(c: MpesaConfig): boolean {
  return hasCommon(c) && !!(c.b2cShortcode && c.b2cInitiatorName && c.b2cSecurityCredential);
}

/** Turns 0712 345 678, +254712345678, 712345678 or 0112345678 into 2547XXXXXXXX / 2541XXXXXXXX; null if not a Kenyan mobile. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  let d = String(input).replace(/[^0-9]/g, '');
  if (d.startsWith('254')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^[17][0-9]{8}$/.test(d) ? `254${d}` : null;
}

/** Daraja timestamp, YYYYMMDDHHmmss in Kenya time (UTC+3, no daylight saving). */
export function darajaTimestamp(now: Date = new Date()): string {
  const k = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}${p(k.getUTCHours())}${p(k.getUTCMinutes())}${p(k.getUTCSeconds())}`;
}

/** Whole shillings, at least 1. M-Pesa does not take cents. */
export function toAmount(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  return whole >= 1 && whole <= 250000 ? whole : null;
}

/** Fee in KES for one transaction, or null when the rate card doesn't have the number yet. */
export function feeFor(rule: FeeRule, amount: number): number | null {
  if (rule.kind === 'percent') {
    if (rule.percent == null) return null;
    if (amount < rule.freeBelowKes) return 0;
    const fee = Math.round(amount * rule.percent) / 100;
    return rule.capKes == null ? fee : Math.min(fee, rule.capKes);
  }
  const band = rule.bands.find((b) => amount >= b.minKes && amount <= b.maxKes);
  return band ? band.feeKes : null;
}

export const collectionFee = (amount: number) => feeFor(RATE_CARD.collection, amount);
export const payoutFee = (amount: number) => feeFor(RATE_CARD.b2c, amount);
export const rateCardDate = () => RATE_CARD.rateCardDate;

export function stkPushBody(c: MpesaConfig, o: { amount: number; phone: string; paymentId: string; reference: string; now?: Date }) {
  const timestamp = darajaTimestamp(o.now);
  return {
    BusinessShortCode: c.shortcode,
    Password: Buffer.from(`${c.shortcode}${c.passkey}${timestamp}`).toString('base64'),
    Timestamp: timestamp,
    TransactionType: c.transactionType,
    Amount: o.amount,
    PartyA: o.phone,
    PartyB: c.partyB,
    PhoneNumber: o.phone,
    CallBackURL: `${c.callbackBaseUrl}/api/payment/stk-callback/${c.callbackToken}/${o.paymentId}`,
    AccountReference: o.reference.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || 'TaskMolly',
    TransactionDesc: 'Task Molly',
  };
}

export function b2cBody(c: MpesaConfig, o: { amount: number; phone: string; payoutId: string; remarks: string }) {
  const base = `${c.callbackBaseUrl}/api/payment`;
  return {
    OriginatorConversationID: o.payoutId,
    InitiatorName: c.b2cInitiatorName,
    SecurityCredential: c.b2cSecurityCredential,
    CommandID: 'BusinessPayment',
    Amount: o.amount,
    PartyA: c.b2cShortcode,
    PartyB: o.phone,
    Remarks: o.remarks.slice(0, 100) || 'Task Molly payout',
    QueueTimeOutURL: `${base}/b2c-timeout/${c.callbackToken}/${o.payoutId}`,
    ResultURL: `${base}/b2c-result/${c.callbackToken}/${o.payoutId}`,
    Occassion: '',
  };
}

export type StkResult = {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount: number | null;
  receipt: string | null;
};

/** Reads Safaricom's STK callback body; null if it isn't one. */
export function parseStkCallback(body: any): StkResult | null {
  const cb = body?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== 'string') return null;
  const items: any[] = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
  const item = (name: string) => items.find((i) => i?.Name === name)?.Value;
  const amount = Number(item('Amount'));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? ''),
    amount: Number.isFinite(amount) ? amount : null,
    receipt: item('MpesaReceiptNumber') != null ? String(item('MpesaReceiptNumber')) : null,
  };
}

export type B2cResult = {
  conversationId: string | null;
  originatorConversationId: string | null;
  resultCode: number;
  resultDesc: string;
  transactionId: string | null;
  amount: number | null;
};

/** Reads Safaricom's B2C result body; null if it isn't one. */
export function parseB2cResult(body: any): B2cResult | null {
  const r = body?.Result;
  if (!r || r.ResultCode == null) return null;
  const params: any[] = Array.isArray(r.ResultParameters?.ResultParameter) ? r.ResultParameters.ResultParameter : [];
  const amount = Number(params.find((p) => p?.Key === 'TransactionAmount')?.Value);
  return {
    conversationId: r.ConversationID ? String(r.ConversationID) : null,
    originatorConversationId: r.OriginatorConversationID ? String(r.OriginatorConversationID) : null,
    resultCode: Number(r.ResultCode),
    resultDesc: String(r.ResultDesc ?? ''),
    transactionId: r.TransactionID ? String(r.TransactionID) : null,
    amount: Number.isFinite(amount) ? amount : null,
  };
}

// ---- Calls to Safaricom ----

let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

async function accessToken(c: MpesaConfig): Promise<string> {
  const key = `${c.baseUrl}|${c.consumerKey}`;
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const auth = Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString('base64');
  const res = await fetch(`${c.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Daraja sign-in failed (HTTP ${res.status})`);
  const data: any = await res.json();
  const ttl = Math.max(60, Number(data.expires_in) || 3599) - 60;
  cachedToken = { key, token: String(data.access_token), expiresAt: Date.now() + ttl * 1000 };
  return cachedToken.token;
}

async function post(c: MpesaConfig, path: string, body: unknown): Promise<any> {
  const res = await fetch(`${c.baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(c)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || String(data.ResponseCode ?? '') !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || `Daraja request failed (HTTP ${res.status})`);
  }
  return data;
}

export async function sendStkPush(c: MpesaConfig, body: ReturnType<typeof stkPushBody>) {
  const data = await post(c, '/mpesa/stkpush/v1/processrequest', body);
  return { checkoutRequestId: String(data.CheckoutRequestID), merchantRequestId: String(data.MerchantRequestID), customerMessage: String(data.CustomerMessage || '') };
}

export async function sendB2c(c: MpesaConfig, body: ReturnType<typeof b2cBody>) {
  const data = await post(c, '/mpesa/b2c/v3/paymentrequest', body);
  return { conversationId: String(data.ConversationID), originatorConversationId: String(data.OriginatorConversationID) };
}
