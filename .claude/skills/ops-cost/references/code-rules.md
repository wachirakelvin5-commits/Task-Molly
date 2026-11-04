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

## Tracking visits and events

**Visits are counted by Cloudflare Web Analytics** (`src/lib/webAnalytics.ts`, since 2026-11).
It costs no Firestore reads or writes, has no cookies, and the numbers are in the Cloudflare
dashboard (Analytics & Logs → Web Analytics). The old Firestore `analytics` collection is
read-only history: its rule refuses all writes, and the admin "Visit history" loads it only
when asked (up to 10,000 reads per load).

Cloudflare counts **page addresses**. Things that open without changing the address (blog
articles and the home page's pop-up sections, which open in place) are not counted
separately. To count them, give them their own address (a route), not a Firestore event.

**Before adding any tracking:**

1. **Prefer Cloudflare** (or another outside tool with a free tier) over Firestore. Never add
   a Firestore write that signed-out visitors can make: it reopens the hole where a script can
   use up the 20,000 writes/day for everyone.
2. **If something must be stored in Firestore** (e.g. a business event for signed-in users,
   such as "request posted"), account for the cost and write it in the PR description:
   - **New event type, or an event sent more often:** adds **writes**. Estimate
     `events per user per day × users per day` against 20,000/day (`references/limits.md`).
     Anything that fires more than about once per screen needs a reason.
   - **New field on an existing record:** no extra writes (a write costs the same whatever
     its size), but more **stored data** (1 GiB limit) and index entries. Estimate
     `bytes × records per day × 365`. Keep values short and cap their length.
   - **Reading it back:** every record a screen loads is a read. Load summaries or use
     `getCountFromServer`, not thousands of raw records, and never in a live listener.
   - **On the pay-as-you-go plan:** also give the cost in KES (prices in `references/limits.md`).
3. **Lock the rule to the exact shape.** List the fields with `hasOnly`, check each type and
   size, require `timestamp == request.time` and the signed-in user's id. Add a rules test that
   sends the real record, built by the same code the app uses, so a field added to the app but
   not the rule fails the "Firestore rules tests" step of the PR check. A mismatch is otherwise
   silent if the app hides the error, as tracking code usually does.
4. **No personal data in tracking.** No names, emails, phone numbers, IP addresses or exact
   locations. Under Kenya's Data Protection Act, adding any of these needs a privacy-policy
   change first. A new outside tracking tool also needs a line on the privacy page
   (`src/components/PrivacyView.tsx`).
5. **Publish the rules before the site ships a new field.** `deploy.yml` publishes only the
   website, not the rules, so records sent before the new rules are live are lost. Publish
   `firestore.rules` first (Firebase console, or
   `firebase deploy --only firestore:rules --project task-molly`), then merge. For removals,
   merge first, then publish.
6. **Update this file** (hot spots below) and `references/limits.md`.

The same exact-shape pattern covers forum posts (`src/components/ForumSidebar.tsx`) and
complaints (`src/components/ComplaintModal.tsx`): a new field there needs the rule updated
too. Those show an error to the user rather than failing silently.

## Known hot spots (2026-11-02)

| Where | Cost | Suggested fix |
|---|---|---|
| `src/pages/AdminAnalytics.tsx` — "Visit history" loads up to 10,000 old `analytics` docs | Up to 10,000 reads, but only when an admin clicks "Load history" (fixed 2026-11; it used to be a live query on every open). | Fine as is. If the history is no longer needed, export it and delete the collection. |
| ~~Firestore visit tracking~~ | Removed 2026-11: visits moved to Cloudflare Web Analytics, so no more writes or growth from page views. | — |
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
