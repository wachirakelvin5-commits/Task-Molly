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
3. **Budget alert** — Billing → Budgets & alerts. There should be a budget for the Cloud Run
   billing account ("My Billing Account") of US$15 (`GCP_BUDGET_ALERT`), alerting at 50/90/100%.
   If missing, give the user the steps to create it.
4. **Gemini** — both keys are paid Tier 1: confirm they are deleted, or spent US$0 last month.
5. **Sentry** — sentry.io → Usage stats: how much of the monthly quota was used, and were
   events dropped?
6. **GitHub / Cloudflare** — only check if a build failed for "minutes" or "quota" reasons.
7. **M-Pesa** (once live) — add up last month's fees from Firestore payment records using
   `daraja-fees.md`; report total and KES per task.
8. **Renewals** — anything renewing in the next 60 days (domain especially)?
9. **New tools** — run `scan-connections.mjs`, and ask the user if anything was set up
   outside the repo this month (new accounts, portals, subscriptions).
10. **Write it down** — add a row to the "Last review" table in `inventory.md`, with the
   USD→KES rate used, and compare each line with `budget.md`, and list up to three actions, biggest saving first.
