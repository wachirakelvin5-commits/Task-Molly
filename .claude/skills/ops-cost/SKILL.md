---
name: ops-cost
description: Manage what it costs to run Task Molly — Firebase (Spark plan), Cloud Run (server.ts), Gemini key, M-Pesa Daraja fees, Sentry, GitHub, Cloudflare and the domain. Use when the user asks about hosting costs, bills, budgets, free-tier limits, "are we close to the limit", a monthly cost review, Daraja/M-Pesa fees, or before adding/changing Firestore queries, live listeners, tracking events, Cloud Run settings or a new paid service.
---

# Task Molly operations: cost management

Task Molly's goal is to run inside free tiers wherever possible and keep every paid item
under a monthly budget in **KES**. This skill is how to check that, explain it, and keep
new code from breaking it.

## Key facts (read these first)

- **Firebase project `task-molly` is on the Spark (free) plan.** Spark never sends a bill —
  when a daily limit is hit, Firestore **stops working for everyone until the daily reset**
  (midnight US Pacific ≈ 10:00–11:00 Nairobi time). On Spark the risk is an *outage*, not a bill.
- **`server.ts` runs on Cloud Run**, deployed from Google AI Studio. Cloud Run needs a billing
  account, so it lives in a *different* Google Cloud project from `task-molly`. That project is
  where a real bill can appear.
- **Daraja (M-Pesa) API calls are free; M-Pesa transaction fees are not.** The payment routes in
  `server.ts` are still placeholders, so fees start the day real payments go live.
- **Budget:** KES 2,500/month (proposed, not approved — user reviews it once the remaining details are in; see `references/budget.md`), with a US$15 Google
  Cloud budget alert. Expected spend is KES 250–700. Convert USD bills to KES at the day's
  rate and write the rate you used next to the number.
- **Gemini:** two keys on paid Tier 1, nothing in the code uses them. Any Gemini spend is a problem.

## Keeping the list of tools complete

Tools reach Task Molly two ways, and both must end up in `references/inventory.md`:

1. **Tools that show up in the GitHub repo** (a package, an API address, a key name, a
   workflow, a hosting config file). Find them with:
   ```bash
   node .claude/skills/ops-cost/scripts/scan-connections.mjs
   ```
   It compares what the code uses against `connections.json` and marks anything unknown
   **NEW**. The same scan runs on every pull request (`pr-check.yml`) and leaves a warning —
   it never blocks a merge. For each NEW item: if it can cost money, add a service to
   `connections.json` and a row to `inventory.md` (and `limits.md` / `budget.md` if it has a
   free limit or a cost); if not, add it to `reviewed` in `connections.json`. Re-run until it
   says "Nothing new".
2. **Tools set up outside the repo** (a console, portal or account — e.g. the domain
   registrar, Safaricom portal, WhatsApp Business, an email/SMS provider, Cloud Run
   settings). The scan can't see these; the user tells you about them. When they do:
   ask for anything missing (plan, cost, owner account, renewal date, where the bill is),
   add a row to `inventory.md` with "Found by: manual", add a service with
   `"outsideRepo": true` to `connections.json` (plus its hosts/env names, so the scan
   recognises it if code for it is added later), and update `budget.md`.

## What to do for each kind of request

| Request | Do this |
|---|---|
| "What are we paying for?" / "what does X cost?" | Answer from `references/inventory.md`. If a field says TBD, say so and tell the user where to look. |
| "Are we close to a limit?" | Compare the usage the user gives (or the console screenshot) with `references/limits.md`. Report as % of the limit. |
| Monthly cost review | Follow `references/monthly-review.md` step by step and update the inventory's "Last review" table. |
| Anything about M-Pesa / Daraja money | Use `references/daraja-fees.md`. Never invent a tariff — use the table there, or ask the user for the current rate card. |
| Code change touching Firestore, analytics, Cloud Run, sockets, or a new external service | Check it against `references/code-rules.md` **before** writing the code, and estimate the daily reads/writes it adds. |
| "Check for new tools / connections" | Run the scan (above), and use the GitHub tools to look at the latest pull request checks for "New outside connection" warnings. |
| User reports a tool set up outside the repo | Follow "Tools set up outside the repo" above. |
| "What should our budget be?" / budget questions | `references/budget.md`. Rebuild the table if tools were added or removed. |

## Rules

1. Prices and free limits change. The numbers in `references/limits.md` carry a "checked on"
   date — if it is older than ~3 months, re-check the official pricing page before relying on it,
   and update the file.
2. Give costs in KES first, original currency in brackets: "KES 1,290 (US$10)".
3. Never put API keys, M-Pesa credentials or billing account numbers in this repo.
4. Never change billing settings, delete keys, or change Cloud Run settings yourself — give the
   user the steps, since those live in consoles you can't reach.
5. When a fix trades cost for features (e.g. fewer live updates), say what the user loses.
