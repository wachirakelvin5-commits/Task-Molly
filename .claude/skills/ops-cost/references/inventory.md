# Task Molly cost inventory

Keep this up to date. "TBD" means nobody has checked yet.

```
MONTHLY_BUDGET_KES: TBD        # total for all paid items (not counting M-Pesa fees, tracked separately)
ALERT_AT_PERCENT:   50, 90, 100
```

## Services

| Service | Used for | Plan | Cost now | Where to see usage / bill | Owner (account) | Renews |
|---|---|---|---|---|---|---|
| Firebase `task-molly` — Firestore, Auth, Cloud Messaging | All app data, Google sign-in, push notifications | **Spark (free)** | KES 0 | console.firebase.google.com → task-molly → Usage and billing | TBD | — |
| Cloud Run (`server.ts`) | `/api/*` routes (assign/cancel task, live providers, M-Pesa placeholders), Socket.IO chat | Pay-as-you-go with free tier | TBD | console.cloud.google.com → (AI Studio's project) → Billing → Reports | TBD | monthly |
| Artifact Registry / Cloud Build (same project as Cloud Run) | Stores and builds the Cloud Run container images | Pay-as-you-go with free tier | TBD | same Billing → Reports, group by Service | TBD | monthly |
| AI Studio Build chat (the assistant used to edit the app) | Making code changes that get pushed to GitHub | **Free tier requests** (seen in Chat settings → Usage, 2026-11-02) | KES 0 | aistudio.google.com → the app → Chat settings → Usage | TBD | — |
| Gemini API keys `...BX0Q` (created 2026-10-05) and `...ivl4` (2026-03-13), project `gen-lang-client-0157826223` | **Nothing** — Molly concierge was removed; no code calls them | **Tier 1 (paid)**, billed to "My Billing Account" | TBD — check each key's usage/spend icons | aistudio.google.com/apikey (see "Checking the Gemini key" below) | TBD | — |
| M-Pesa via Daraja | Client payments (STK push) and provider payouts (B2C) — **not live yet** | Per-transaction fees | KES 0 (placeholders) | M-PESA for Business portal (org.ke.m-pesa.com) | TBD | — |
| GitHub Pages + Actions | Hosts task-molly.com; builds PRs and deploys | Free | KES 0 | github.com → Settings → Billing and plans | wachirakelvin5-commits | — |
| Cloudflare Pages | Hosts the admin site | Free | KES 0 | dash.cloudflare.com → Workers & Pages | TBD | — |
| Sentry | Error tracking, 10% of page loads traced | TBD (likely free Developer plan) | TBD | sentry.io → Settings → Subscription / Usage stats | TBD | monthly |
| Domain task-molly.com | Main website address | Yearly | TBD | Registrar: TBD | TBD | TBD |
| Google Sheets web app | Receives "unlisted service" requests | Free | KES 0 | — | TBD | — |
| Photon (komoot), Unsplash, picsum, Google Fonts | Address search, images, font | Free (fair use) | KES 0 | — | — | — |

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
