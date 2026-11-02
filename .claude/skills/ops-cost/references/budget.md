# Budget

**Status: proposed 2026-11-02, not yet approved — user will review once the remaining details (M-Pesa rate card) are in.** Actual Google Cloud spend so far: **US$0** (Gemini and the whole billing account, 2026-11-02), so the Google lines below are safety margin, not expected cost. Rate used: US$1 ≈ KES 130 (check the
day's rate when reviewing).

## Monthly budget: KES 2,500

Task Molly's tools are almost all on free tiers, so the expected spend is close to zero.
The budget is mostly a safety margin, so a mistake (a Cloud Run setting, a busy key) is
caught before it gets expensive.

| Line | Expected / month | Budget / month | Why |
|---|---|---|---|
| Cloud Run (`server.ts`) | KES 0–400 | KES 1,000 | Low traffic fits the free tier. Budget covers a busy month or open chat connections. |
| Artifact Registry + Cloud Build (same project) | KES 0–50 | (inside Cloud Run line) | Stored container images over 0.5 GB; builds usually free. |
| Gemini API (2 Tier 1 keys) | **KES 0** (US$0 spent 6 Oct–2 Nov 2026) | KES 0 | Nothing uses Gemini. **Any** spend here is a problem to investigate. Its spend cap is US$100 — lower it to the minimum. |
| Firebase (Spark) | KES 0 | KES 0 | Free plan can't bill. |
| Firebase Blaze reserve | KES 0 | KES 500 | If Spark limits start being hit, moving to Blaze at ~2× today's usage costs roughly KES 200–300/month. Reserve so that move isn't blocked. |
| Domain task-molly.com (GoDaddy) | ~KES 250 | KES 250 | Paid ~US$10 the first time, but GoDaddy's standard .com renewal is ~US$23/yr (≈ KES 3,000). Budgeted at the renewal price until GoDaddy's account page confirms it. |
| Sentry, GitHub, Cloudflare Pages, Google Sheets, Photon, images | KES 0 | KES 0 | Free plans. |
| Buffer | — | KES 750 | Anything not listed yet. |
| **Total** | **KES 250–700** | **KES 2,500** | |

## The billing account is prepaid

"My Billing Account" runs on prepaid credit. On 2026-11-02 the balance showed as depleted,
but the account had spent US$0 — the balance is most likely just zero. Top-ups are how this
budget gets spent: top up only when actual spend appears, about one month of the Google
Cloud lines at a time (≈ US$10–15), so a mistake can't drain a large balance.

## Alerts to set

- **Google Cloud budget on "My Billing Account": US$15/month (≈ KES 1,950)** — a US$75 budget
  already exists; edit it down to US$15 under Budgets & caps — alerts at 50%,
  90% and 100%. Covers Cloud Run, Artifact Registry, Cloud Build, Gemini — and Firebase too,
  if it ever moves to Blaze on this account.
  Steps: console.cloud.google.com → Billing → My Billing Account → Budgets & alerts →
  Create budget → all projects, all services → amount US$15 → thresholds 50/90/100%.
- **Separate check:** Gemini spend above US$0 in any month → find what's calling it.

## M-Pesa fees (outside this budget)

M-Pesa fees grow with the number of tasks, so they're tracked per task, not as a fixed
budget. Proposed target until the real rate card is in: **fees ≤ 10% of Task Molly's
commission on each task.** Check this when `daraja-fees.md` has real numbers.

## When to revisit the budget

- When M-Pesa payments go live.
- When Firebase moves to Blaze.
- When a new paid service is added (`scan-connections` flags it, or the user reports it).
- If actual spend is over 80% of a line two months in a row.
