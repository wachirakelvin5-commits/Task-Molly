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
| Firebase `task-molly` — Firestore, Auth, Cloud Messaging | All app data, Google sign-in, push notifications | **Spark (free)** | KES 0 | console.firebase.google.com → task-molly → Usage and billing | taskmolly254@gmail.com (confirmed 2026-11-16) | — | repo |
| Cloud Run service `task-molly` (`server.ts`), project `gen-lang-client-0157826223`, region europe-west3 (Frankfurt), deployed from source 2026-10-12, public access | `/api/*` routes (cancel task, M-Pesa in `server/paymentRoutes.ts`), Socket.IO chat — **but the live site doesn't reach it** (see below) | Postpay, free tier | **US$0** (Oct 2026 invoice); 0 requests/sec on 2026-11-02 | console.cloud.google.com → (AI Studio's project) → Billing → Reports | wachirakelvin5@gmail.com (published it 2026-11-02, per the Cloud Run log) | monthly | repo |
| Artifact Registry / Cloud Build (same project as Cloud Run) | Stores and builds the Cloud Run container images | Pay-as-you-go with free tier | TBD | same Billing → Reports, group by Service | TBD | monthly | repo |
| AI Studio Build chat (the assistant used to edit the app) | Making code changes that get pushed to GitHub | **Free tier requests** (seen in Chat settings → Usage, 2026-11-02) | KES 0 | aistudio.google.com → the app → Chat settings → Usage | TBD | — | manual |
| Gemini API keys `...BX0Q` (created 2026-10-05) and `...ivl4` (2026-03-13), project `gen-lang-client-0157826223` | **Nothing** — Molly concierge was removed; no code calls them | **Tier 1 (paid)**, billed to "My Billing Account". Monthly spend cap US$100 (AI Studio → Spend) | **US$0.00** (6 Oct – 2 Nov 2026) | aistudio.google.com/apikey (see "Checking the Gemini key" below) | wachirakelvin5@gmail.com's project | — | repo |
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
`fetch('/api/cancel-service-request')` (`src/pages/Dashboard.tsx`). On GitHub Pages those go to task-molly.com/api/…, which doesn't
exist — they never reach Cloud Run. Same for Socket.IO chat (`src/pages/ChatPage.tsx`
connects to the page's own address). Cloud Run is only reached by opening its own
`*.run.app` address (e.g. the AI Studio preview). That's why it showed 0 requests/sec.

**Tested on the live site 2026-11-02 (all worked — they use Firestore, not Cloud Run):**
create a task, provider accepts it, task chat both ways (`src/lib/taskChat.ts`), chat history
still there after logging out and back in. Cancelling from My tasks (`ClientTasks.tsx`) and
from the chat page also use Firestore (`cancelRequest`).

**Still pointing at Cloud Run (likely broken on the live site):**
- `src/pages/Dashboard.tsx` — Cancel button on the client dashboard's ongoing-job card
  (`/api/cancel-service-request`).
- Assigning a provider (`/api/assign-task`, `/api/live-providers`) was removed on 2026-11-16:
  providers choose their own tasks (accept in `ProviderServices.tsx`, client confirms).
- `src/pages/ChatPage.tsx` (`/chat/:jobId`) — Socket.IO chat; messages aren't saved anywhere.

Moving these to the Firestore helpers in `src/lib/serviceRequests.ts` (e.g. `cancelRequest`)
would leave nothing using Cloud Run, so it could be turned off — removing the only
pay-per-use service from the Google bill.

Consequences:
- Cost: it costs nothing now, but it's a public URL with open CORS — anyone who finds it can
  make it work (and bill). Keep min instances 0 and a low max instances.
- Function: on the live site, cancel request (client dashboard) / Socket.IO chat
  likely fail. Decision for the user: point the live site at Cloud Run (API base URL), move
  those features to Firestore, or turn Cloud Run off.

## Accounts, projects and apps (checked 2026-11-16)

Two Google accounts are involved. Use the right one, or the console shows "Start your free
trial" / "no permission" instead of the real project.

| Google account | What it holds |
|---|---|
| taskmolly254@gmail.com | Firebase project `task-molly` (database, sign-in, push, rules, the web API key). Also the AI Studio app `680a72ae-…`, which is linked to GitHub. Its publish step offers a "Default Gemini Project" with no billing (probably `gen-lang-client-0837059735`, seen 2026-11-02 with no billing and no Cloud Run access). |
| wachirakelvin5@gmail.com | "My Billing Account" and project `gen-lang-client-0157826223` ("Default Gemini Project"): Cloud Run `task-molly` (https://task-molly.ai.studio), the two Gemini keys, and the AI Studio app `b797b3b4-…`, which publishes that server. |

**The server runs old code from the wrong app.** AI Studio app `b797b3b4` owns
`task-molly.ai.studio` but isn't linked to GitHub, so its copy of the code is old. Pulling
GitHub into the linked app (`680a72ae`) and publishing on 2026-11-02 left the old code
running: `/api/payment/lipa-na-mpesa` still answered "(Placeholder)" on 2026-11-03. The
server also uses its own Firestore database (`ai-studio-b797b3b4-…` in
`gen-lang-client-0157826223`), not the `task-molly` database the website uses. Plan: retire
this server and move payments to Cloud Functions in `task-molly` (see the security review).
Don't publish from the GitHub-linked app either: its project has no billing.

**Firebase web API key** (`Browser key (auto created by Firebase)`, ends `…PqLh9o`, project
`task-molly`), restricted 2026-11-16:
- APIs: Identity Toolkit, Token Service, Cloud Firestore, Firebase Installations, FCM
  Registration, Firebase App Check.
- Websites: `https://task-molly.com/*`, `https://www.task-molly.com/*`,
  `https://task-molly.firebaseapp.com/*`, `https://task-molly-admin.pages.dev/*`,
  `https://*.task-molly-admin.pages.dev/*`.
- A new site address (for example a custom domain for the admin site) must be added here
  first, or sign-in fails there.
- To check it: a sign-in API call (`identitytoolkit.googleapis.com/v1/projects?key=…`) with
  no `Referer`, or one from another site, should get 403 "Requests from referer … are
  blocked". Firestore calls ignore the key, so don't use them to test; Firestore is guarded
  by the rules.

**Gemini key use:** the API dashboard for `gen-lang-client-0157826223` showed one Gemini
request on 2026-11-16, which failed (prepaid balance US$0). Nothing in the code calls
Gemini, so delete the unused keys when cleaning up.

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
