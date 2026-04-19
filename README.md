# Osinachi · Portfolio 2026

Vite + React 19 + TypeScript SPA. Tailwind v4, Zod-validated content, Vercel serverless API, Vercel Blob for the CV.

## Run

```bash
bun install
bun run dev        # Vite dev server + /api/* served by local shim
bun run build      # production build (tsc + vite)
bun run typecheck  # tsc only
```

## Layout

```
api/              Vercel serverless functions (GET /api/<name>)
src/
  content/*.json  All site copy, parsed by Zod at load time
  shared/data/    Schemas + content adapters (frontend + api)
  lib/            api client, siteContent context, scroll helper
  hooks/          usePalette, useRoute, useSiteContent, ...
  sections/       Cover, About, Work, Contact
  components/     Nav (holds NAV_ENTRIES), PageBand, Html, ...
  pages/          /interactive iframe page
  styles/         portfolio.css (design system, 1:1 port) + overrides
vite.config.ts    Dev shim that serves api/ like Vercel in prod
```

## CV — uploading via Vercel Blob

The `/api/cv` endpoint redirects to `cv/current.pdf` in a Vercel Blob store. Visitors clicking **Download** get the latest version; the link in `contact.json` never changes.

### One-time setup

1. Vercel dashboard → **Storage** → **Create** → **Blob**. Name it anything.
2. Connect the store to this project so `BLOB_READ_WRITE_TOKEN` is injected at runtime.

### Uploading (or replacing) the CV

1. Open the blob store in the Vercel dashboard → **Browser** tab.
2. **Upload** a PDF with the path **`cv/current.pdf`**.
   - If one exists, use **Replace** so the path is kept.
   - The pathname must match exactly — `api/cv.ts` does `head("cv/current.pdf")`.
3. That's it. The endpoint redirects to the new file within ~60s (CDN cache TTL).

No redeploy needed. No commit. Just upload.

### Local development

To test `/api/cv` against your real blob store locally, copy the token into `.env.local`:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

Token lives in the Vercel dashboard → Storage → `<your store>` → **.env.local** tab. `.env.local` is gitignored.

## Deploy

Push to a branch connected to Vercel. The `api/` folder deploys as serverless functions automatically; no `vercel.json` needed for this layout.
