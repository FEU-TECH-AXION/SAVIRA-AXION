# SAVIRA Internal Web App

Internal-only staff, case officer, legal personnel, and admin web app. Deploy this as a separate Vercel project on an internal subdomain; do not merge it into the public/survivor-facing deployment.

## Local Setup

```bash
cd web/internal
npm install
npm run dev
```

By default, Next runs on `http://localhost:3000`. Use `npm run dev -- -p 3001` if the public app is already using that port.

## Environment

Create `web/internal/.env.local` from `env.sample`.

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
INTERNAL_SESSION_MAX_AGE_SECONDS=7200
```

The Supabase URL and anon key may be shared with the public app. `NEXT_PUBLIC_FRONTEND_URL` should point at the public frontend deployment so internal login can send users to the existing public forgot-password flow. Do not put `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, database passwords, mail secrets, or any backend-only credential in this app. Anything prefixed with `NEXT_PUBLIC_` is bundled for the browser.

## Deployment

Create a dedicated Vercel project with `web/internal` as the root directory and point it at the internal subdomain. Keep its environment variables separate from the public web project.

This app rejects non-internal roles at its auth boundary before creating an internal session. Backend and Supabase policies should still enforce the same role rules server-side.
