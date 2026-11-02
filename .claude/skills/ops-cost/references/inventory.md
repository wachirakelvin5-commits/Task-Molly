# Task Molly cost inventory

Keep this up to date. "TBD" means nobody has checked yet.
"Found by": **repo** = the connection scan sees it in the code; **manual** = set up in a
console/portal and reported by the user (the scan can't see it).

```
MONTHLY_BUDGET_KES: 2500       # PROPOSED 2026-11-02, see budget.md (M-Pesa fees tracked separately)
GCP_BUDGET_ALERT:   US$15      # on "My Billing Account"
ALERT_AT_PERCENT:   50, 90, 100
```

## Services

| Service | Used for | Plan | Cost now | Where to see usage / bill | Owner (account) | Renews | Found by |
|---|---|---|---|---|---|---|---|
| Firebase `task-molly` — Firestore, Auth, Cloud Messaging | All app data, Google sign-in, push notifications | **Spark (free)** | KES 0 | console.firebase.google.com → task-molly → Usage and billing | TBD | — | repo |
| Cloud Run (`server.ts`) | `/api/*` routes (assign/cancel task, live providers, M-Pesa placeholders), Socket.IO chat | Pay-as-you-go with free tier | TBD | console.cloud.google.com → (AI Studio's project) → Billing → Reports | TBD | monthly | repo |
| Artifact Registry / Cloud Build (same project as Cloud Run) | Stores and builds the Cloud Run container images | Pay-as-you-go with free tier | TBD | same Billing → Reports, group by Service | TBD | monthly | repo |
| AI Studio Build chat (the assistant used to edit the app) | Making code changes that get pushed to GitHub | **Free tier requests** (seen in Chat settings → Usage, 2026-11-02) | KES 0 | aistudio.google.com → the app → Chat settings → Usage | TBD | — | manual |
| Gemini API keys `...BX0Q` (created 2026-10-05) and `...ivl4` (2026-03-13), project `gen-lang-client-0157826223` | **Nothing** — Molly concierge was removed; no code calls them | **Tier 1 (paid)**, billed to "My Billing Account". Monthly spend cap US$100 (AI Studio → Spend) | **US$0.00** (6 Oct – 2 Nov 2026) | aistudio.google.com/apikey (see "Checking the Gemini key" below) | TBD | — | repo |
| M-Pesa via Daraja | Client payments (STK push) and provider payouts (B2C) — **not live yet** | Per-transaction fees | KES 0 (placeholders) | M-PESA for Business portal (org.ke.m-pesa.com) | TBD | — | manual |
| GitHub Pages + Actions | Hosts task-molly.com; builds PRs and deploys | Free | KES 0 | github.com → Settings → Billing and plans | wachirakelvin5-commits | — | repo |
| Cloudflare Pages | Hosts the admin site | Free | KES 0 | dash.cloudflare.com → Workers & Pages | TBD | — | repo |
| Sentry | Error tracking, 10% of page loads traced | TBD (likely free Developer plan) | TBD | sentry.io → Settings → Subscription / Usage stats | TBD | monthly | repo |
| Domain task-molly.com | Main website address | GoDaddy, yearly. User paid ~US$10 (likely a first-year/promo price); GoDaddy's standard .com renewal is ~US$22.99 + US$0.20 ICANN fee (third-party listing, May 2026) | ~KES 3,000/yr (~KES 250/month) until the renewal price is confirmed | godaddy.com → My Products → Domains → task-molly.com (shows renewal date and price) | TBD | TBD — check in GoDaddy | manual |
| Google Sheets web app | Receives "unlisted service" requests | Free | KES 0 | — | TBD | — | repo |
| Photon (komoot), Unsplash, picsum, Google Fonts | Address search, images, font | Free (fair use) | KES 0 | — | — | — | repo |

## Google billing account ("My Billing Account")

- **Owner:** the Google account signed in to AI Studio (shown at the bottom left of
  aistudio.google.com). Other Google accounts see "Add billing account" in Cloud Console,
  so switch accounts (avatar, top right) before checking billing. Don't create a second
  billing account from another account: the Task Molly projects wouldn't use it.
- **Prepaid**: Google takes credit bought up front, not a monthly invoice. When the credit
  runs out, paid services on the account can be **suspended** until it's topped up.
- **2026-11-02: AI Studio showed "Prepay credits depleted … Purchase credits to resume
  service."** Gemini spent US$0 in the previous 28 days, so the credit went on something
  else on this account, most likely Cloud Run / Artifact Registry / Cloud Build. Confirm in
  console.cloud.google.com → Billing → My Billing Account → Reports (last 3 months, group
  by Service), and check Cloud Run (`server.ts`) is still serving.
- Check the remaining credit balance in every monthly review.

## Checking the Gemini key

1. Open **aistudio.google.com/apikey**, signed in with the account that made the key.
   Each key shows its Google Cloud project and its plan: **Free** or **Paid / Tier 1+**.
2. If it says Paid, open **console.cloud.google.com → Billing → Reports**, pick that project,
   and filter Service to "Gemini API" / "Generative Language API" to see what it has cost.
3. **console.cloud.google.com → APIs & Services → Generative Language API → Metrics** shows
   whether anything has called it recently.
4. Nothing in the code uses it (checked 2026-11-02: no `GoogleGenAI` in `src/`, `admin/`,
   or `server.ts`). Recommended: delete the key in AI Studio, remove `GEMINI_API_KEY` from
   the Cloud Run environment variables, and remove `@google/genai` from `package.json`.

## Last review

| Month | Firebase peak day (reads / writes) | Cloud Run (KES) | Gemini (KES) | Sentry | M-Pesa fees (KES) | Total paid (KES) | USD→KES rate | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
