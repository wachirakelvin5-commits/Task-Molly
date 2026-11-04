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
| Cloud Run service `task-molly` (`server.ts`), project `gen-lang-client-0157826223`, region europe-west3 (Frankfurt), deployed from source 2026-10-12, public access | `/api/*` routes (assign/cancel task, live providers, M-Pesa in `server/paymentRoutes.ts`), Socket.IO chat — **but the live site doesn't reach it** (see below) | Postpay, free tier | **US$0** (Oct 2026 invoice); 0 requests/sec on 2026-11-02 | console.cloud.google.com → (AI Studio's project) → Billing → Reports | TBD | monthly | repo |
| Artifact Registry / Cloud Build (same project as Cloud Run) | Stores and builds the Cloud Run container images | Pay-as-you-go with free tier | TBD | same Billing → Reports, group by Service | TBD | monthly | repo |
| AI Studio Build chat (the assistant used to edit the app) | Making code changes that get pushed to GitHub | **Free tier requests** (seen in Chat settings → Usage, 2026-11-02) | KES 0 | aistudio.google.com → the app → Chat settings → Usage | TBD | — | manual |
| Gemini API keys `...BX0Q` (created 2026-10-05) and `...ivl4` (2026-03-13), project `gen-lang-client-0157826223` | **Nothing** — Molly concierge was removed; no code calls them | **Tier 1 (paid)**, billed to "My Billing Account". Monthly spend cap US$100 (AI Studio → Spend) | **US$0.00** (6 Oct – 2 Nov 2026) | aistudio.google.com/apikey (see "Checking the Gemini key" below) | TBD | — | repo |
| M-Pesa via Daraja | Client payments (STK push) and provider payouts (B2C) — **code in `server/paymentRoutes.ts`, switched off until `MPESA_*` is set on Cloud Run** | Per-transaction fees | KES 0 (switched off) | M-PESA for Business portal (org.ke.m-pesa.com) | TBD | — | manual |
| GitHub Pages + Actions | Hosts task-molly.com; builds PRs and deploys | Free | KES 0 | github.com → Settings → Billing and plans | wachirakelvin5-commits | — | repo |
| Cloudflare Pages | Hosts the admin site | Free | KES 0 | dash.cloudflare.com → Workers & Pages | TBD | — | repo |
| Cloudflare Web Analytics | Counts visits to task-molly.com (script in `src/lib/webAnalytics.ts`, since 2026-11). Replaced the Firestore `analytics` events. | Free | KES 0 | dash.cloudflare.com → Analytics & Logs → Web Analytics | TBD (same Cloudflare account as Pages) | — | repo |
| Sentry (org `task-molly`) | Error tracking, 10% of page loads traced | Plan TBD (likely free Developer) — usage 3 Oct–2 Nov 2026: ~15 errors, ~230 spans, **no events dropped for quota** (checked via Sentry tools) | KES 0 | sentry.io → Settings → Subscription / Usage stats | TBD | monthly | repo |
| Domain task-molly.com | Main website address | GoDaddy, yearly. User paid ~US$10 (likely a first-year/promo price); GoDaddy's standard .com renewal is ~US$22.99 + US$0.20 ICANN fee (third-party listing, May 2026) | ~KES 3,000/yr (~KES 250/month) until the renewal price is confirmed | godaddy.com → My Products → Domains → task-molly.com (shows renewal date and price) | TBD | TBD — check in GoDaddy | manual |
| Google Sheets web app | Receives "unlisted service" requests | Free | KES 0 | — | TBD | — | repo |
| Photon (komoot), Unsplash, picsum, Google Fonts | Address search, images, font | Free (fair use) | KES 0 | — | — | — | repo |

## Cloud Run: is it used?

The live site (task-molly.com on GitHub Pages) calls the API with relative addresses such as
`fetch('/api/assign-task')` (`src/components/TaskerAssignmentModal.tsx`,
`src/pages/Dashboard.tsx`). On GitHub Pages those go to task-molly.com/api/…, which doesn't
exist — they never reach Cloud Run. Same for Socket.IO chat (`src/pages/ChatPage.tsx`
connects to the page's own address). Cloud Run is only reached by opening its own
`*.run.app` address (e.g. the AI Studio preview). That's why it showed 0 requests/sec.

**Tested on the live site 2026-11-02 (all worked — they use Firestore, not Cloud Run):**
create a task, provider accepts it, task chat both ways (`src/lib/taskChat.ts`), chat history
still there after logging out and back in. Cancelling from My tasks (`ClientTasks.tsx`) and
from the chat page also use Firestore (`cancelRequest`).

**Still pointing at Cloud Run (likely broken on the live site):**
- `src/pages/Dashboard.tsx` — Cancel button on the client dashboard's ongoing-job card
  (`/api/cancel-service-request`), and assigning a provider (`/api/assign-task`).
- `src/components/TaskerAssignmentModal.tsx` — picking a specific tasker
  (`/api/live-providers`, `/api/assign-task`).
- `src/pages/ChatPage.tsx` (`/chat/:jobId`) — Socket.IO chat; messages aren't saved anywhere.

Moving these to the Firestore helpers in `src/lib/serviceRequests.ts` (e.g. `cancelRequest`)
would leave nothing using Cloud Run, so it could be turned off — removing the only
pay-per-use service from the Google bill.

Consequences:
- Cost: it costs nothing now, but it's a public URL with open CORS — anyone who finds it can
  make it work (and bill). Keep min instances 0 and a low max instances.
- Function: on the live site, assign task / cancel request / live providers / Socket.IO chat
  likely fail. Decision for the user: point the live site at Cloud Run (API base URL), move
  those features to Firestore, or turn Cloud Run off.

## Google billing account ("My Billing Account")

- **Owner:** the Google account signed in to AI Studio (shown at the bottom left of
  aistudio.google.com). Other Google accounts see "Add billing account" in Cloud Console,
  so switch accounts (avatar, top right) before checking billing. Don't create a second
  billing account from another account: the Task Molly projects wouldn't use it.
- **Projects on this account (2026-11-02):** only `Default Gemini Project`
  (`gen-lang-client-0157826223`). Cloud Run for `server.ts` must be in this project to be
  billed here — confirm at console.cloud.google.com/run?project=gen-lang-client-0157826223.
- **Invoices:** monthly, from Google Cloud EMEA Limited (Ireland), in USD with a KES
  reference. **Kenyan VAT 16% is added** to any charge. October 2026 invoice: **US$0.00 /
  KES 0** (rate on invoice: US$1 = KES 129.75).
- **The account pays two ways** (Billing → Overview → How you pay, checked 2026-11-02):
  - **Postpay — Google Cloud services** (Cloud Run, Artifact Registry, Cloud Build, everything
    except Gemini). The card on file is charged after use, monthly or when the balance reaches
    the **US$100 payment threshold**. Balance US$0. Services never pause for lack of credit,
    so the **budget alert is the only early warning**.
  - **Prepay — AI Studio** (Gemini API only). Credit balance US$0, no credit ever bought,
    auto-reload off. This is why AI Studio says "Prepay credits depleted" — harmless, and it
    means paid Gemini calls can't cost anything. **Keep it this way: don't buy credits or
    turn on auto-reload** unless Task Molly starts using Gemini again.
- **Budget alert: US$15/month** (lowered from US$75 on 2026-11-02). All projects, all
  services, monthly; emails billing admins at 50% (US$7.50), 90% (US$13.50) and 100% (US$15)
  of actual spend. Alerts only — nothing is stopped.

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
