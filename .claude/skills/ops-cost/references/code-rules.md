# Code rules to keep costs down

Check these before changing Firestore, analytics, `server.ts` or adding a service.
Always state the estimated extra **reads/day** and **writes/day** a change adds, using
today's traffic (ask the user, or use the admin Site Analytics numbers).

## Firestore (Spark: 50,000 reads / 20,000 writes per day)

1. **Every query needs a `limit()`.** No unbounded `getDocs` / `onSnapshot`.
2. **Live listeners (`onSnapshot`) only where people need to see changes instantly** — chat,
   a task's status. For lists that rarely change, use a one-off `getDocs` or a refresh button.
   A listener re-reads every changed doc for every screen that has it open.
3. **Unsubscribe** listeners when the screen closes (return the unsubscribe from `useEffect`).
4. **Counts:** use `getCountFromServer` (1 read per 1,000 docs counted) instead of loading
   docs just to count them.
5. **Don't write on every small event.** Group tracking events, or skip ones nobody reads.

## Known hot spots (2026-11-02)

| Where | Cost | Suggested fix |
|---|---|---|
| `src/pages/AdminAnalytics.tsx` — live query of up to 10,000 `analytics` docs (`MAX_EVENTS`) | Up to 10,000 reads every time the screen opens or the range changes, plus reads for each new visit while it's open. Five opens a day can use the whole Spark read limit. | Store daily totals in one summary doc per day (written once per visit with `increment`, or rolled up); load the summaries, not raw events. Or at minimum use `getDocs` + refresh button and a lower limit. |
| `src/lib/analytics.ts` — one write per page view and per page exit | ~2 writes per page viewed. At ~10,000 page views/day the write limit is hit. | Drop `page_exit` or merge it into the `page_view` doc; sample if traffic grows. |
| `analytics` collection is never cleaned up | Grows towards the 1 GiB stored-data limit | Delete raw events older than 90 days (after summaries exist). On Spark, TTL policies aren't available — do it with a scheduled clean-up or manually. |
| 13 files use `onSnapshot` (dashboards, chat, forum, complaints, admin) | Reads scale with users × open screens | Review each against rule 2. |

## Cloud Run (`server.ts`)

- The live site can't reach Cloud Run through relative `/api/...` calls (see inventory.md,
  "Cloud Run: is it used?"). Don't add new `/api` features until that's decided.

- Keep **minimum instances = 0** and a low maximum (e.g. 2–3) so a traffic spike or bot can't
  run up a bill.
- Socket.IO chat keeps connections open and billed. Task chat already uses Firestore
  (`src/lib/taskChat.ts`); prefer that over adding more Socket.IO features.
- Don't add work that runs on a timer inside the server — Cloud Run bills while it runs.
- New environment variables / secrets go in Cloud Run settings, never in the repo.

## New paid services

Before adding any SDK or API that can bill: add it to `inventory.md`, note its free limit in
`limits.md`, and tell the user what it will cost at today's traffic and at 10× traffic.
