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

## Changing what analytics records

Visit events are built in **`src/lib/analyticsEvent.ts`** and sent by `src/lib/analytics.ts`.
Because signed-out visitors can write them, the `analytics` rule in **`firestore.rules`**
accepts only that exact shape: the listed fields, their types and their maximum sizes.

**The risk:** a field added to the builder but not to the rule is **rejected silently**. The
app deliberately hides analytics errors so visitors never notice, and the admin Site analytics
screen just quietly loses data. The rules test in `tests/firestore.rules.test.ts`
("analytics events") sends events from the real builder, so a mismatch fails the
"Firestore rules tests" step of the PR check (`pr-check.yml`).

When a field or event type is added, removed or changed:

1. **Change all three together, in one PR:** the builder (`analyticsEvent.ts`), the
   `analytics` rule (`firestore.rules`: the `hasOnly` list, plus a type and size check for the
   new field), and the test (add a case that uses the new field or event type).
2. **Run `npm run test:rules`.** It must pass; never loosen the rule to `allow create: if true`
   to make it pass.
3. **Account for the cost, and write it in the PR description:**
   - **New event type, or an existing event sent more often** (e.g. on scroll or click): this
     adds **writes**. Estimate `events per visit × visits per day` and compare it with
     20,000/day (`references/limits.md`). Anything that fires more than about once per
     screen needs a reason. Prefer adding a field to an existing event over a new event.
   - **New field on an existing event:** no extra writes (a write costs the same whatever its
     size), but it adds **stored data** (the 1 GiB limit, and `analytics` is never cleaned up)
     and more **index entries**. Estimate `bytes per event × events per day × 365`. Keep
     values short (codes, not sentences), and cap their length in both the builder and the rule.
   - **Reads:** the admin screen loads up to `MAX_EVENTS` (10,000) raw events each time it
     opens. More event types means that window covers fewer days. It does not change the read
     cost per open.
   - **On the pay-as-you-go plan** (once moved): also give the cost in KES, at about
     US$0.18 per 100,000 writes (check `references/limits.md` for the current price).
4. **No personal data.** No names, emails, phone numbers, IP addresses or exact locations:
   analytics is anonymous by design (see the header of `src/lib/analytics.ts`). Under Kenya's
   Data Protection Act, adding any of these needs a privacy-policy change first.
5. **Publish the rules before the site ships the change.** `deploy.yml` publishes only the
   website, not the rules. If the site sends the new field before the new rules are live,
   those events are lost. So publish `firestore.rules` first (Firebase console, or
   `firebase deploy --only firestore:rules --project task-molly`), then merge. For removals,
   merge first, then publish.
6. **Update this file** (the hot spots table below) and `references/limits.md` if the writes
   per page view changed.

The same pattern (exact fields and sizes in the rule, a test with the real shape) also covers
forum posts (`src/components/ForumSidebar.tsx`) and complaints
(`src/components/ComplaintModal.tsx`). A new field there needs the rule updated too, but
those show an error to the user instead of failing silently.

## Known hot spots (2026-11-02)

| Where | Cost | Suggested fix |
|---|---|---|
| `src/pages/AdminAnalytics.tsx` — live query of up to 10,000 `analytics` docs (`MAX_EVENTS`) | Up to 10,000 reads every time the screen opens or the range changes, plus reads for each new visit while it's open. Five opens a day can use the whole Spark read limit. | Store daily totals in one summary doc per day (written once per visit with `increment`, or rolled up); load the summaries, not raw events. Or at minimum use `getDocs` + refresh button and a lower limit. |
| `src/lib/analytics.ts` — one write per page view and per page exit | ~2 writes per page viewed. At ~10,000 page views/day the write limit is hit. Signed-out scripts can also write events: the rule limits their shape and size (2026-11-04) but not how many, so a script can still flood the limit. | Drop `page_exit` or merge it into the `page_view` doc; sample if traffic grows. Stopping floods needs App Check (or moving page views off Firestore). |
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
