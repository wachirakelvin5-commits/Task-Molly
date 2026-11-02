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

## Where the rates come from

- **Consumer tariffs** (what *clients and providers* pay to send, withdraw, or pay a Paybill
  when the customer bears the fee): safaricom.co.ke → M-PESA → Tariffs & limits →
  Consumer tariffs. Matters when deciding whether Task Molly or the client pays the fee.
- **Business tariffs** (what *Task Molly* pays for collections, B2C payouts and
  withdrawals): the M-PESA for Business tariff page, or the rate in the Paybill/Till
  contract from Safaricom. These are the numbers the budget needs.

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

## Indicative rates from news and third-party guides (2026-11-02, NOT confirmed)

Safaricom's own pages were blocked from the session, so these come from secondary sources.
Use them only for rough planning. They do not replace the rate card above.

- **Till (Buy Goods) collections:** about **0.55% of each payment, paid by the merchant**,
  free under KES 500, capped at KES 200 (from KES ~36,363 up).
  Source: paybillke.com, "M-Pesa Till charges for business 2026".
- **Paybill collections and B2C payouts:** no public table. Guides say Safaricom
  **negotiates these per merchant** through a Safaricom Business Account Manager, with lower
  rates at high volume (5,000+ transactions a month).
- **Moving money out of a Till** (to a phone or a Paybill): cut by up to 50% from
  **7 Aug 2026**. Transfers of KES 100 or less are free. Reports did not say whether the cut
  continues past **31 Oct 2026**, so confirm before using it.
  Sources: The Standard, "Safaricom halves M-Pesa merchant fees in CBK-led move";
  tech-ish.com, "M-Pesa Pochi / Buy Goods tariff cuts 2026" (1 Aug 2026).

Rough example with the Till rate: a KES 2,000 task costs about **KES 11** to collect.
Task Molly's commission is **15%** (`COMMISSION_RATE` in `src/lib/adminMetrics.ts`; the
provider gets 85%), so KES 300. Collection alone is about 3.7% of that, inside the 10% target
in `budget.md`. The payout fee comes on top and is the bigger cost (see the estimate below).

## Estimate (2026-11-02, from the unconfirmed rates above)

**Assumptions:**
- Collections use the Till rate: 0.55%, no fee under KES 500, capped at KES 200.
- Each task has one B2C payout costing **KES 20 (low) to KES 108 (high)**. This is the
  third-party range; the real band rates are still TBD.
- Commission is 15% of the price.
- No withdrawal charges.

Replace these with the rate card when it comes in.

**Per task**

| Task price | Commission (15%) | Collection fee | Payout fee | Total fees | Share of commission |
|---|---|---|---|---|---|
| KES 500 | KES 75 | ~KES 3 | KES 20–108 | KES 23–111 | **31%–148%** |
| KES 1,000 | KES 150 | ~KES 6 | KES 20–108 | KES 26–114 | **17%–76%** |
| KES 2,000 | KES 300 | KES 11 | KES 20–108 | KES 31–119 | **10%–40%** |
| KES 5,000 | KES 750 | ~KES 28 | KES 20–108 | KES 48–136 | **6%–18%** |

**Per month (average task KES 2,000, one payout per task)**

| Tasks / month | Commission | M-Pesa fees | Left after fees |
|---|---|---|---|
| 50 | KES 15,000 | KES 1,550–5,950 | KES 9,050–13,450 |
| 200 | KES 60,000 | KES 6,200–23,800 | KES 36,200–53,800 |
| 1,000 | KES 300,000 | KES 31,000–119,000 | KES 181,000–269,000 |

**What this shows:**
- **The payout fee decides whether the 10% target holds.** The collection fee is small.
  With one payout per task, the target is only met on tasks of about KES 2,000 or more, and
  only if B2C is near the low end of the range.
- **Small tasks can lose money.** At the high B2C rate, a KES 500 task costs more in fees
  than its KES 75 commission.
- **Ways to bring it down:**
  - **Batch payouts:** one payout per provider per day or week, instead of one per task.
    The trade-off is that providers wait longer for their money.
  - **Minimum task price:** for example KES 1,000.
  - **Pass the payout fee to the provider:** deduct it from their 85%.
  - **Negotiate the B2C rate** with the Safaricom account manager.
- Get the real B2C band rates (item 2) before choosing between these.

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
