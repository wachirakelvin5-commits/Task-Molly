# Task Molly

Domestic services platform for Kenya (React + Vite front end, Firebase, `server.ts` on Cloud Run,
admin site on Cloudflare Pages).

## How updates are made

`main` is protected (GitHub ruleset "Protect main", since 2026-11-21): every change arrives
through a pull request, the `check` job in `pr-check.yml` must pass before it can merge (tests,
rules tests, the cost-connection scan and both builds), and `main` can't be force-pushed or
deleted. Nobody is on the bypass list. Merging into `main` deploys the site to GitHub Pages
(`deploy.yml`).

The app is edited from two places:

- **Claude:** works on a `claude/...` branch and opens a pull request into `main`.
- **Google AI Studio:** can no longer push straight to `main`; GitHub refuses it. Bring an AI
  Studio edit in on its own branch with a pull request, or make the change through Claude
  instead. Don't add anyone to the ruleset's bypass list to let AI Studio through.

To keep the two from overwriting each other:

- Start each Claude change from the latest `main` (fetch first).
- After a PR is merged, pull the AI Studio project from GitHub (GitHub tab → Pull changes to
  Google AI Studio) before editing there. Otherwise its next push can undo the merged change.
- Two AI Studio apps exist: `680a72ae-…` is linked to GitHub; `b797b3b4-…` owns
  `task-molly.ai.studio` but isn't linked and holds old code. See
  `.claude/skills/ops-cost/references/inventory.md` → "Accounts, projects and apps".
- Keep AI Studio's files: `metadata.json`, `firebase-applet-config.json`, `@google/genai` in
  `package.json` and `GEMINI_API_KEY` in `.env.example`.
- AI Studio may overwrite `firebase-applet-config.json` or drop `CNAME`. The deploy restores both
  from `.github/live-config/`, so to change the live settings, edit the copies there.
- AI Studio doesn't keep `package-lock.json`, so don't commit one.

## Checks before a PR

- `npm install --legacy-peer-deps`
- `npm run test:metrics`
- `npm run build` and `npm run build:admin`
- `node .claude/skills/ops-cost/scripts/scan-connections.mjs --ci` after adding a package, env var
  or outside service. Use the `ops-cost` skill before adding anything that could cost money.
- `npm run lint` currently reports 18 type errors already on `main` (mostly `key` props in
  `src/pages/ProviderServices.tsx`). Don't add new ones.

## Notes

- `firebase-applet-config.json` is the app's Firebase config (imported by `src/firebase.ts` and
  `server.ts`).
- No code calls Gemini right now. Its keys are on a paid tier, so check the `ops-cost` skill before
  adding a Gemini feature.
