# M-Pesa (Daraja) fees

**Status (2026-11-02):** `/api/payment/lipa-na-mpesa` and `/api/payment/b2c-payout` in
`server.ts` are placeholders. No real money moves, so fees are KES 0 today.

## How the money works

- **Daraja API itself is free.** Safaricom charges normal M-Pesa transaction fees on the
  Paybill/Till the API uses.
- **Collections (client pays Task Molly)** — STK push ("Lipa na M-Pesa Online") into a Paybill
  or Till. The business pays a merchant fee per payment (set per Paybill/Till; for some
  Paybill setups the customer pays instead).
- **Payouts (Task Molly pays a provider)** — B2C from the Paybill's utility account. The
  business pays a fee per payout, by amount band. Rates are negotiated with Safaricom;
  third-party guides quote roughly KES 20–108 per payout (unconfirmed).
- **Moving money out** — withdrawing from the Paybill/Till to a bank or wallet has its own
  charge. Safaricom cut these by up to 50% from 7 Aug 2026.

## Rate card (fill in from the M-PESA for Business portal or the Safaricom account manager)

Do not guess these. Leave TBD until the user gives the real numbers.

```
SHORTCODE_TYPE:          TBD   # Paybill or Till
WHO_PAYS_COLLECTION_FEE: TBD   # business or customer
RATE_CARD_DATE:          TBD
```

| Transaction | Amount band (KES) | Fee (KES) |
|---|---|---|
| Collection (STK push) | TBD | TBD |
| B2C payout | 1–100 | TBD |
| B2C payout | 101–1,500 | TBD |
| B2C payout | 1,501–5,000 | TBD |
| B2C payout | 5,001–20,000 | TBD |
| B2C payout | 20,001–250,000 | TBD |
| Withdraw to bank | — | TBD |

## Monthly estimate

```
M-Pesa fees = (number of client payments × collection fee for their band)
            + (number of provider payouts × B2C fee for their band)
            + withdrawal charges
```

Report it as **KES per task** as well as a monthly total — it shows how much of Task Molly's
commission goes to Safaricom. Batching payouts (one payout per provider per day instead of
per task) cuts the B2C count; say what that does to provider payout speed.

## When payments go live

Before the placeholders are replaced, make sure:
- Callback URLs point at Cloud Run (each callback is one extra Cloud Run request — tiny cost).
- Every payment and payout is written to Firestore with its fee, so the monthly review can
  add them up instead of guessing.
- Daraja credentials go in Cloud Run environment variables / Secret Manager, never in the repo.
