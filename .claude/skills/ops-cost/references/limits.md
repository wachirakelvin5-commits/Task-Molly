# Free limits and prices

**Checked on: 2026-11-02.** Re-check the official page if this date is more than ~3 months old.

## Firebase Spark plan (project `task-molly`)

Hitting a limit = that feature stops until the reset. No bill. Reset: midnight US Pacific
(≈ 10:00 Nairobi in the US summer, 11:00 in winter).

| Item | Free limit | Notes for Task Molly |
|---|---|---|
| Firestore document reads | **50,000 / day** | The tightest limit. Live listeners (`onSnapshot`) count every document on first load and every changed document after. |
| Firestore writes | **20,000 / day** | Visits no longer write here (moved to Cloudflare Web Analytics, 2026-11). Signed-out visitors can't write anything. Writes now come from signed-in actions: sign-ups, requests, job updates, chat, forum, complaints. |
| Firestore deletes | 20,000 / day | |
| Firestore stored data | 1 GiB | `analytics` no longer grows (old events kept as read-only history). |
| Firestore network out | 10 GiB / month | |
| Authentication (Google sign-in) | 50,000 monthly active users | |
| Cloud Messaging (push) | Free, no limit | |

Source: firebase.google.com/pricing

After moving to the pay-as-you-go (Blaze) plan, the same daily allowance stays free, then
approximately: writes US$0.18, reads US$0.06, deletes US$0.02 per 100,000 (prices vary a
little by database location; check cloud.google.com/firestore/pricing for the `task-molly`
location).

## Cloud Run (the AI Studio project)

| Item | Free each month | Price after (Tier 1, approx.) |
|---|---|---|
| Requests | 2 million | US$0.40 per million |
| CPU | 180,000 vCPU-seconds (request-based billing) | ~US$0.000024 per vCPU-second |
| Memory | 360,000 GiB-seconds (request-based billing) | ~US$0.0000025 per GiB-second |

Instance-based billing has a different allowance (Google lists 240,000 vCPU-s / 450,000 GiB-s).
Free tier is shared across all projects on one billing account.

Things that make Cloud Run cost money for Task Molly:
- **Minimum instances above 0** — an instance runs (and bills) all day, every day.
- **Socket.IO** (`server.ts`, `src/pages/ChatPage.tsx`) — every open chat connection keeps a
  request open, and Cloud Run bills the whole time it's open.
- **Old container images** in Artifact Registry (0.5 GB free storage, then per-GB monthly).

Source: cloud.google.com/run/pricing

## Other services

| Service | Free limit | What happens at the limit |
|---|---|---|
| GitHub Actions | Unlimited for public repos; 2,000 minutes/month for private (Free plan) | Workflows stop until next month |
| GitHub Pages | 100 GB bandwidth/month (soft) | Warning email |
| Cloudflare Pages | 500 builds/month, unlimited bandwidth | Builds queue/stop |
| Cloudflare Web Analytics | Free, no visit limit published. History kept about 6 months; large traffic may be sampled (check developers.cloudflare.com/web-analytics) | Older history drops off; no bill |
| Sentry (Developer plan) | Check sentry.io → Usage stats for the current quota | Extra events are dropped (no bill unless pay-as-you-go is turned on) |
| Gemini API (Free tier) | Rate limits per minute/day; no bill | Requests rejected |
