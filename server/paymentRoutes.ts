// M-Pesa routes for server.ts. Every payment and payout is written to Firestore with its fee,
// so the monthly cost review can add them up (see .claude/skills/ops-cost/references/daraja-fees.md).
//
//   POST /api/payment/lipa-na-mpesa   signed-in client: { requestId, phone? } -> STK prompt on their phone
//   POST /api/payment/b2c-payout      admin only:      { requestId }          -> pays the provider
//   POST /api/payment/stk-callback/:token/:paymentId     Safaricom only
//   POST /api/payment/b2c-result/:token/:payoutId        Safaricom only
//   POST /api/payment/b2c-timeout/:token/:payoutId       Safaricom only

import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { timingSafeEqual } from 'crypto';
import { ADMIN_EMAILS } from '../src/lib/admin.ts';
import {
  readConfig, isCollectionReady, isPayoutReady, normalizePhone, toAmount,
  collectionFee, payoutFee, rateCardDate, stkPushBody, b2cBody, sendStkPush, sendB2c,
  parseStkCallback, parseB2cResult,
} from './mpesa.ts';

/** Task states in which the client can be asked to pay (a provider is confirmed). */
const PAYABLE = ['assigned', 'in-progress', 'awaiting-confirmation', 'completed'];
/** An STK prompt expires after about a minute; allow a new one after this. */
const PROMPT_RETRY_MS = 2 * 60 * 1000;
const COMMISSION_RATE = 0.15; // same as src/lib/adminMetrics.ts

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function signedInUser(auth: Auth, req: Request): Promise<DecodedIdToken> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Sign in first');
  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'Sign in again');
  }
}

function isAdminToken(user: DecodedIdToken): boolean {
  return !!user.email && user.email_verified === true && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

function sendError(res: Response, error: unknown, what: string) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error(`[M-Pesa] ${what} failed:`, error);
  return res.status(502).json({ error: 'M-Pesa did not accept the request. Try again shortly.' });
}

export function registerPaymentRoutes(app: Express, db: Firestore, auth: Auth) {
  const config = readConfig();
  console.log(`[M-Pesa] collections ${isCollectionReady(config) ? 'ON' : 'off'}, payouts ${isPayoutReady(config) ? 'ON' : 'off'} (${config.baseUrl})`);

  const fromSafaricom = (req: Request) => !!config.callbackToken && sameSecret(String(req.params.token || ''), config.callbackToken);

  // ---- Client pays (STK push) ----
  app.post('/api/payment/lipa-na-mpesa', async (req, res) => {
    try {
      if (!isCollectionReady(config)) throw new HttpError(503, 'M-Pesa payments are not switched on yet');
      const user = await signedInUser(auth, req);
      const requestId = String(req.body?.requestId || '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) throw new HttpError(400, 'Missing task');

      const requestRef = db.collection('serviceRequests').doc(requestId);
      const paymentRef = db.collection('payments').doc();

      // Reserve the payment in one transaction so a double tap can't send two prompts.
      const { amount, phone, reference } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(requestRef);
        const task = snap.data();
        if (!snap.exists || !task || task.clientId !== user.uid) throw new HttpError(404, 'Task not found');
        if (!PAYABLE.includes(task.status)) throw new HttpError(409, 'This task is not ready for payment');
        if (task.paymentStatus === 'paid') throw new HttpError(409, 'This task is already paid');
        const lastPrompt = task.paymentRequestedAt?.toMillis?.() || 0;
        if (task.paymentStatus === 'pending' && Date.now() - lastPrompt < PROMPT_RETRY_MS) {
          throw new HttpError(409, 'A payment prompt was just sent. Check your phone.');
        }
        const amount = toAmount(task.clientPrice ?? task.budget);
        if (!amount) throw new HttpError(409, 'This task has no price');
        const phone = normalizePhone(req.body?.phone ?? task.clientPhone);
        if (!phone) throw new HttpError(400, 'Enter an M-Pesa number like 0712 345 678');
        const fee = collectionFee(amount);

        tx.set(paymentRef, {
          requestId, clientId: user.uid, providerId: task.providerId || null,
          amount, phone, status: 'pending',
          feeKes: fee, feeRateCardDate: rateCardDate(), feeKnown: fee != null,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(requestRef, {
          paymentStatus: 'pending', paymentId: paymentRef.id,
          paymentRequestedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        return { amount, phone, reference: String(task.taskNumber ?? requestId) };
      });

      try {
        const sent = await sendStkPush(config, stkPushBody(config, { amount, phone, paymentId: paymentRef.id, reference: `TM${reference}` }));
        await paymentRef.update({ checkoutRequestId: sent.checkoutRequestId, merchantRequestId: sent.merchantRequestId, updatedAt: FieldValue.serverTimestamp() });
        res.json({ success: true, paymentId: paymentRef.id, message: sent.customerMessage || 'Check your phone and enter your M-Pesa PIN' });
      } catch (error) {
        await paymentRef.update({ status: 'failed', resultDesc: String((error as Error).message), updatedAt: FieldValue.serverTimestamp() });
        await requestRef.update({ paymentStatus: 'failed', updatedAt: FieldValue.serverTimestamp() });
        throw error;
      }
    } catch (error) {
      sendError(res, error, 'STK push');
    }
  });

  app.post('/api/payment/stk-callback/:token/:paymentId', async (req, res) => {
    // Always answer 200 to Safaricom, or it keeps retrying.
    const ack = () => res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    if (!fromSafaricom(req)) return res.status(403).end();
    const result = parseStkCallback(req.body);
    if (!result) return ack();
    try {
      const paymentRef = db.collection('payments').doc(String(req.params.paymentId));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(paymentRef);
        const payment = snap.data();
        if (!payment || payment.status !== 'pending') return; // unknown, or already settled
        if (payment.checkoutRequestId && payment.checkoutRequestId !== result.checkoutRequestId) return;
        const paid = result.resultCode === 0 && result.amount === payment.amount;
        const status = paid ? 'paid' : result.resultCode === 0 ? 'amount-mismatch' : 'failed';
        tx.update(paymentRef, {
          status, resultCode: result.resultCode, resultDesc: result.resultDesc,
          mpesaReceipt: result.receipt, paidAmount: result.amount,
          updatedAt: FieldValue.serverTimestamp(), ...(paid ? { paidAt: FieldValue.serverTimestamp() } : {}),
        });
        tx.update(db.collection('serviceRequests').doc(payment.requestId), {
          paymentStatus: status, updatedAt: FieldValue.serverTimestamp(),
          ...(paid ? { paidAt: FieldValue.serverTimestamp() } : {}),
        });
      });
    } catch (error) {
      console.error('[M-Pesa] STK callback could not be saved:', error);
    }
    ack();
  });

  // ---- Task Molly pays the provider (B2C) ----
  app.post('/api/payment/b2c-payout', async (req, res) => {
    try {
      if (!isPayoutReady(config)) throw new HttpError(503, 'M-Pesa payouts are not switched on yet');
      const user = await signedInUser(auth, req);
      if (!isAdminToken(user)) throw new HttpError(403, 'Only admins can send payouts');
      const requestId = String(req.body?.requestId || '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) throw new HttpError(400, 'Missing task');

      const requestRef = db.collection('serviceRequests').doc(requestId);
      const payoutRef = db.collection('payouts').doc();

      const { amount, phone } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(requestRef);
        const task = snap.data();
        if (!snap.exists || !task) throw new HttpError(404, 'Task not found');
        if (task.status !== 'completed') throw new HttpError(409, 'Only completed tasks can be paid out');
        if (task.paymentStatus !== 'paid') throw new HttpError(409, 'The client has not paid for this task yet');
        if (!task.providerId) throw new HttpError(409, 'This task has no provider');
        // 'unknown' = Safaricom timed out; check the M-PESA portal before paying again.
        if (['pending', 'paid', 'unknown'].includes(task.payoutStatus)) throw new HttpError(409, `Payout already ${task.payoutStatus}`);
        const price = toAmount(task.clientPrice ?? task.budget) || 0;
        const amount = toAmount(task.providerPrice) ?? toAmount(price * (1 - COMMISSION_RATE));
        if (!amount || (price && amount > price)) throw new HttpError(409, 'The payout amount looks wrong');
        const provider = (await tx.get(db.collection('users').doc(task.providerId))).data() || {};
        const phone = normalizePhone(provider.phone ?? provider.phoneNumber);
        if (!phone) throw new HttpError(409, 'The provider has no valid M-Pesa number on their profile');
        const fee = payoutFee(amount);

        tx.set(payoutRef, {
          requestId, providerId: task.providerId, amount, phone, status: 'pending',
          feeKes: fee, feeRateCardDate: rateCardDate(), feeKnown: fee != null,
          requestedBy: user.email, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(requestRef, { payoutStatus: 'pending', payoutId: payoutRef.id, updatedAt: FieldValue.serverTimestamp() });
        return { amount, phone };
      });

      try {
        const sent = await sendB2c(config, b2cBody(config, { amount, phone, payoutId: payoutRef.id, remarks: `Task Molly task ${requestId}` }));
        await payoutRef.update({ conversationId: sent.conversationId, updatedAt: FieldValue.serverTimestamp() });
        res.json({ success: true, payoutId: payoutRef.id, message: 'Payout sent to M-Pesa' });
      } catch (error) {
        await payoutRef.update({ status: 'failed', resultDesc: String((error as Error).message), updatedAt: FieldValue.serverTimestamp() });
        await requestRef.update({ payoutStatus: 'failed', updatedAt: FieldValue.serverTimestamp() });
        throw error;
      }
    } catch (error) {
      sendError(res, error, 'B2C payout');
    }
  });

  async function settlePayout(payoutId: string, update: (payout: any) => { status: string; fields: Record<string, unknown> } | null) {
    const payoutRef = db.collection('payouts').doc(payoutId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(payoutRef);
      const payout = snap.data();
      if (!payout || payout.status !== 'pending') return;
      const next = update(payout);
      if (!next) return;
      tx.update(payoutRef, { status: next.status, ...next.fields, updatedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection('serviceRequests').doc(payout.requestId), { payoutStatus: next.status, updatedAt: FieldValue.serverTimestamp() });
    });
  }

  app.post('/api/payment/b2c-result/:token/:payoutId', async (req, res) => {
    if (!fromSafaricom(req)) return res.status(403).end();
    const result = parseB2cResult(req.body);
    try {
      if (result) {
        await settlePayout(String(req.params.payoutId), (payout) => {
          if (result.originatorConversationId && result.originatorConversationId !== String(req.params.payoutId)) return null;
          const paid = result.resultCode === 0;
          return {
            status: paid ? 'paid' : 'failed',
            fields: {
              resultCode: result.resultCode, resultDesc: result.resultDesc, mpesaReceipt: result.transactionId,
              paidAmount: result.amount, ...(paid ? { paidAt: FieldValue.serverTimestamp() } : {}),
              ...(paid && result.amount != null && result.amount !== payout.amount ? { amountMismatch: true } : {}),
            },
          };
        });
      }
    } catch (error) {
      console.error('[M-Pesa] B2C result could not be saved:', error);
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  app.post('/api/payment/b2c-timeout/:token/:payoutId', async (req, res) => {
    if (!fromSafaricom(req)) return res.status(403).end();
    try {
      // The money may or may not have moved. Block automatic retries until someone checks the portal.
      await settlePayout(String(req.params.payoutId), () => ({ status: 'unknown', fields: { resultDesc: 'Safaricom timed out; check the M-PESA portal before paying again' } }));
    } catch (error) {
      console.error('[M-Pesa] B2C timeout could not be saved:', error);
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });
}
