# Task Molly

Domestic services platform for Kenya (React + Vite front end, Firebase, `server.ts` on Cloud Run,
admin site on Cloudflare Pages).

## How updates are made

The app is edited from two places, and both push to this GitHub repo:

- **Claude:** works on a `claude/...` branch and opens a pull request into `main`.
  `pr-check.yml` runs the tests, the cost-connection scan and both builds on the PR.
- **Google AI Studio:** pushes edits straight to `main`.

Merging or pushing to `main` deploys the site to GitHub Pages (`deploy.yml`).

To keep the two from overwriting each other:

- Start each Claude change from the latest `main` (fetch first). AI Studio may have pushed since.
- After a Claude PR is merged, sync the AI Studio project from GitHub before editing there.
  Otherwise its next push can undo the Claude change.
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
