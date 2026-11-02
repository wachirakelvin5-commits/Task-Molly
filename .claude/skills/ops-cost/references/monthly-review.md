# Monthly cost review

Run in the first week of each month. The user does the console steps (you can't sign in);
ask for numbers or screenshots, then do the maths and update `inventory.md`.

1. **Firebase (Spark)** — console.firebase.google.com → task-molly → Usage and billing.
   Find the **highest day** last month for reads and writes. Over 60% of a daily limit
   (30,000 reads or 12,000 writes) = warn; over 85% = fix this month (see `code-rules.md`).
   Check stored data against 1 GiB.
2. **Cloud Run project** — console.cloud.google.com → Billing → Reports → last month,
   group by Service. Note Cloud Run, Artifact Registry, Cloud Build, Gemini. Also check the
   Cloud Run service: minimum instances should be 0 unless there's a reason.
3. **How you pay / invoice** — Billing → Overview → How you pay: postpay balance (Cloud
   services) and AI Studio prepay credit (should stay US$0, auto-reload off). Payments →
   Transactions: download last month's invoice; record total, VAT and Google's KES rate.
   **Budget alert** — Billing → Budgets & alerts. Confirm the US$15 budget (`GCP_BUDGET_ALERT`,
   set 2026-11-02) still exists with 50/90/100% alerts, and whether any alert emails came in.
4. **Gemini** — confirm US$0 spent last month (AI Studio → Spend) and the prepay credit is
   still zero with auto-reload off.
5. **Sentry** — run `find_dropped_events` via the Sentry tools (or sentry.io → Usage stats):
   accepted errors/spans for the month, and any drops for quota.
6. **GitHub / Cloudflare** — only check if a build failed for "minutes" or "quota" reasons.
7. **M-Pesa** (once live) — admin dashboard → Money → last month: M-Pesa fees, commission
   after fees, jobs over the 10% target, jobs that lost money, jobs missing a fee. Report the
   total and KES per task (see "Tracking fees against commission" in `daraja-fees.md`).
8. **Renewals** — anything renewing in the next 60 days (domain especially)?
9. **New tools** — run `scan-connections.mjs`, and ask the user if anything was set up
   outside the repo this month (new accounts, portals, subscriptions).
10. **Write it down** — add a row to the "Last review" table in `inventory.md`, with the
   USD→KES rate used, and compare each line with `budget.md`, and list up to three actions, biggest saving first.
