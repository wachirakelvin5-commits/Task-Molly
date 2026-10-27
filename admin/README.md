# Task Molly Admin (separate website)

The admin dashboard: Today, Live operations, Performance, Money, Complaints and Site analytics.
It's a separate website from the customer/provider app, and the admin screens are only included here.

- Screens: shared from `src/pages/Admin*.tsx` and `src/lib/adminMetrics.ts`.
- Sign-in: Google only. Only the emails in `src/lib/admin.ts` get in; anyone else is signed out.
  The data itself is protected by `isAdmin()` in `firestore.rules` (keep both lists the same).
- Firebase settings: always the live copy in `.github/live-config/`, even if AI Studio changes the root file.

## Run locally

```
npm run dev:admin      # http://localhost:3001
npm run build:admin    # output in admin/dist
```

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build:admin` |
| Build output directory | `admin/dist` |
| Root directory | *(leave empty)* |
| Production branch | `main` |

Every domain the site is served on (the `.pages.dev` address and any custom domain) must be added in
Firebase console → Authentication → Settings → Authorized domains, or Google sign-in is blocked.
