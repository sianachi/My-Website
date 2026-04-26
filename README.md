# Osinachi · Portfolio 2026

Vite + React 19 + TypeScript SPA. Tailwind v4, Zod-validated content stored in MongoDB, Vercel serverless API, Vercel Blob for the CV. Passkey-gated admin console at `/core`.

## Run

```bash
bun install
bun run dev          # Vite dev server + /api/* served by local shim
bun run build        # production build (tsc + vite)
bun run typecheck    # tsc only
bun run content:seed # upsert src/content/*.json into MongoDB
```

## Layout

```
api/              Vercel serverless functions
  admin/          passkey auth + content + CV upload-token endpoints
src/
  content/*.json  Seed copy, parsed by Zod at load time
  shared/data/    Schemas + content adapters (frontend + api)
  lib/            api client, siteContent context, adminAuth, adminApi
  hooks/          usePalette, useRoute, useSiteContent, ...
  sections/       Cover, About, Work, Contact
  pages/          AdminPage (/core), admin/ (console + editors), InteractivePortfolio
  styles/         portfolio.css (design system) + admin.css
vite.config.ts    Dev shim that serves api/ like Vercel in prod
deployment/       docker-compose for local Mongo
```

## Local services

The admin endpoints and the seed script need MongoDB. Run it locally with:

```bash
docker compose -f deployment/docker-compose.yml up -d   # mongo:7 on :27017
```

Then create `.env.local` at the project root with:

```
MONGODB_URI=mongodb://localhost:27017/portfolio
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
VITE_ANALYTICS_URL=https://vercel.com/<team>/<project>/analytics
```

`MONGODB_URI` powers the content API + admin endpoints. `BLOB_READ_WRITE_TOKEN` is needed by `/api/cv` and the admin CV uploader. `VITE_ANALYTICS_URL` is the deep-link the admin console uses for the **View analytics** button — defaults to `https://vercel.com/dashboard` if unset.

After Mongo is up, seed it once: `bun run content:seed`.

## Admin console (`/core`)

Visit `/core` to manage the site. The first visit prompts you to register a passkey (WebAuthn); subsequent visits authenticate with that passkey. Sessions are httpOnly cookies, 30 days.

Once signed in, the landing is a **mission-control launchpad** — five tiles that route into sub-pages:

| Tile | Route | What it does |
|---|---|---|
| **Content** | `/core/content` | JSON editor (CodeMirror, palette-themed) + a structured Form mode generated from the Zod schemas. Selecting any sub-tree in JSON mode shows an "Edit as form" tooltip that opens a modal for that node. Both modes write through the same string and validate locally before saving. CDN cache (`s-maxage=3600`) means public propagation can take up to an hour. |
| **Preview** | `/core/preview` | Embedded `<iframe>` of the live `/` route with a Desktop/Mobile viewport toggle. Reflects what's saved (not unsaved edits). `<Analytics />` is suppressed inside iframes so previewing doesn't pollute the data. |
| **CV** | `/core/cv` | PDF picker that uploads directly to Vercel Blob at `cv/current.pdf` via the client-upload pattern (`@vercel/blob/client`'s `upload()` + a server-side token-broker endpoint). Capped at 10MB. |
| **Analytics** | external | Opens `VITE_ANALYTICS_URL` in a new tab (defaults to `https://vercel.com/dashboard`). |
| **Crew** | `/core/account` | Register additional passkeys, sign out. |

The launchpad and every sub-page have a **theme toggle** (binary daylight/midnight, same as the public nav). The launchpad also has a quick **Sign out** in the chrome.

### Adding a passkey on a new device

Sign in on a device that already has a registered passkey, then click **Add another passkey** and enrol the new device. There's no password reset — registering the *first* passkey is only allowed when no admin exists yet, so safeguard at least one device.

## CV — uploading

Primary path: `/core` → **Replace CV** → pick a PDF → **Upload**. `/api/cv` redirects to the new file within ~60s (CDN TTL).

Fallback: Vercel dashboard → Storage → your blob → **Browser** tab → upload a PDF at the exact path `cv/current.pdf`.

## Analytics

`@vercel/analytics` is mounted in `App.tsx` and starts collecting on deploy — no extra config. The admin console links to the Vercel dashboard for viewing; set `VITE_ANALYTICS_URL` to the project-specific URL once you have it. Iframe-embedded views (i.e. the `/core` preview pane) are excluded.

## Deploy

Push to a branch connected to Vercel. The `api/` folder deploys as serverless functions automatically. Set these in the Vercel project's environment variables:

- `MONGODB_URI` — production Mongo connection string
- `BLOB_READ_WRITE_TOKEN` — auto-injected if you connect a Vercel Blob store to the project
- `VITE_ANALYTICS_URL` — analytics dashboard deep-link
