# Osinachi · Portfolio 2026

Vite + React 19 + TypeScript SPA fronting an Express 5 API. Tailwind v4, Zod-validated content in MongoDB, S3-compatible blob storage (MinIO locally / on the VPS), Tiptap WYSIWYG blog editor, passkey-gated admin console at `/core`. Single Bun process serves the SPA + `/api/*` in production. Deployed to k3s on a VPS via GHCR.

## Run

```bash
bun install
bun run dev          # Vite (web) + Express API together via concurrently
bun run dev:web      # Vite alone
bun run dev:api      # bun --watch run server/index.ts (port 3001)
bun run build        # tsc -b && vite build
bun run start        # NODE_ENV=production single process serving dist/ + /api
bun run typecheck    # tsc -b --noEmit
bun run preview      # serve the production build (Vite, no API)
bun run content:seed # upsert src/content/*.json into MongoDB
bun run blog:migrate # backfill tags + readingMinutes on existing blog_posts (idempotent)
```

In dev, Vite proxies `/api/*` to the Express server. In production a single Bun process serves both, so `SameSite=Lax` cookies just work.

## Layout

```
server/             Express 5 app
  index.ts          entry — mounts /api/*, serves dist/ in prod
  routes/           content, blog, cv, admin/*
  lib/              mongo, session, webauthn, s3
src/
  content/*.json    seed copy, parsed by Zod at load time
  shared/data/      schemas + content adapters (frontend + api)
  lib/              api client, siteContent, adminAuth, uploads, markdown
  pages/            AdminPage (/core), admin/* (console + editors), blog/*
  sections/         Cover, About, Work, Contact
  components/       InlineEditor, Nav, MobileMenu, ...
  styles/           portfolio.css (design system) + admin.css + blog.css
deployment/
  docker-compose.yml  local Mongo + MinIO + bucket init
  Dockerfile          production image
  k8s/                manifests for the VPS
scripts/
  seed-content.ts     JSON → MongoDB
.github/workflows/docker-publish.yml   GHCR image build on master
```

## Local services

The API and the seed script need MongoDB; uploads + the blog need S3-compatible storage. `docker-compose.yml` brings up both:

```bash
docker compose -f deployment/docker-compose.yml up -d
```

- `mongo:7` on `:27017`
- MinIO on `:9000` (S3 API) / `:9001` (console). Override host ports with `MINIO_API_PORT` / `MINIO_CONSOLE_PORT` if they collide (Portainer also defaults to 9000).
- `minio-init` one-shot creates the bucket (`S3_BUCKET`, default `portfolio`) and sets it to public-read. Idempotent — safe to re-run on every `up`.

Copy `.env.example` to `.env.local` and seed Mongo once with `bun run content:seed`.

## Environment

```
MONGODB_URI          content API + seed script
RP_ID                WebAuthn relying-party id (hostname, no scheme)
RP_NAME              display name shown in the passkey prompt
RP_ORIGIN            full origin the SPA loads from
S3_ENDPOINT          MinIO/S3 endpoint the server uses
S3_BUCKET            bucket name (default `portfolio`)
S3_ACCESS_KEY_ID     S3 credentials (server-side)
S3_SECRET_ACCESS_KEY
S3_PUBLIC_URL        optional — base URL the browser uses if MinIO is behind a different hostname/proxy. Defaults to S3_ENDPOINT.
S3_REGION            optional — defaults to us-east-1. MinIO ignores it; the AWS SDK requires a value.
PORT                 optional — API listen port. Defaults to 3001.
VITE_ANALYTICS_URL   optional — admin console "Analytics" deep-link. Defaults to https://vercel.com/dashboard.
```

The Zod schemas in `src/shared/data/schemas.ts` are the contract between API and client. Changing one means re-seeding Mongo, otherwise the public site renders an error screen.

## Admin console (`/core`)

Visit `/core` to manage the site. The first visit prompts you to register a passkey (WebAuthn); subsequent visits authenticate with that passkey. Sessions are httpOnly cookies, 30 days. Mission-control launchpad with six tiles:

| Tile | Route | What it does |
|---|---|---|
| **Content** | `/core/content` | JSON editor (CodeMirror, palette-themed) + a structured Form mode generated from the Zod schemas. Selecting any sub-tree in JSON mode shows an "Edit as form" tooltip that opens a modal for that node. CDN cache (`s-maxage=3600`) means public propagation can take up to an hour. |
| **Blog** | `/core/blog` | List, draft, edit, publish, and delete posts. The editor (`BlogRichEditor.tsx`) is a Tiptap WYSIWYG. See **Blog** below. |
| **Preview** | `/core/preview` | Embedded `<iframe>` of the live `/` route with a Desktop/Mobile viewport toggle. `<Analytics />` is suppressed inside iframes. |
| **CV** | `/core/cv` | PDF picker that uploads to S3 at `cv/current.pdf` via a presigned PUT. Capped at 10MB. |
| **Analytics** | external | Opens `VITE_ANALYTICS_URL` in a new tab. |
| **Crew** | `/core/account` | Register additional passkeys, sign out. |

The public site also supports **in-place editing** when an admin session exists: `InlineEditor.tsx` makes the cover/about/work/contact sections `contentEditable` directly on `/`, so copy edits don't require leaving the page. Saves go through the same content endpoints as the JSON editor.

### Adding a passkey on a new device

Sign in on a device that already has a registered passkey, then **Crew → Add another passkey**. Registering the *first* passkey is only allowed when no admin exists yet — safeguard at least one device.

## Blog

Public reader at `/blog` (index) and `/blog/<slug>` (post). Each post owns one folder in S3:

```
blog/<slug>/post.md      ← markdown body, editor-managed, never user-deletable
blog/<slug>/<filename>   ← images / attachments uploaded via the editor
```

`blog_posts` in Mongo holds metadata only — `{ _id (slug), title, excerpt, status, createdAt, updatedAt, publishedAt?, s3ContentKey, tags[], coverImage?, readingMinutes? }`. No inline body. Run `bun run blog:migrate` once after pulling these fields to backfill existing docs.

**Editor** (`src/pages/admin/BlogRichEditor.tsx`): Tiptap WYSIWYG that round-trips HTML ⇆ markdown via `marked` (load) and `turndown` (save). Admins never see raw markdown. The post form (`BlogEditor.tsx`) adds tag chips and a cover-image picker (uses the same presigned-PUT flow as assets). A side-panel **file explorer** (`BlogFileExplorer.tsx`) lists assets in `blog/<slug>/`, supports drag-drop multi-upload, click-to-insert at cursor (`![](url)` for images, `[](url)` otherwise), copy URL, delete. Disabled until the post is saved (no slug yet).

**Reader** (`BlogRenderer.tsx`): renders pre-rendered HTML returned by the API. The server pipeline (`server/lib/markdown.ts:renderPost`) does marked + GFM, footnotes (`marked-footnote`), Shiki dual-theme code highlighting (`github-light` / `github-dark` switched per palette), stable heading IDs, and ¶ permalink anchors on h2/h3. Reading time is computed once on save. The client sanitizes defensively with DOMPurify and adds click-to-copy on the ¶ anchors.

**Discovery & navigation**: `/blog/tag/<tag>` for filtered lists, `/feed.xml` (Atom 1.0, last 30 published posts with full HTML), `/sitemap.xml` includes per-tag URLs, JSON-LD `BlogPosting` per post, `og:image` from `coverImage`. Each post page renders a prev/next footer (`/api/blog/neighbors`) and 3 related posts (`/api/blog/related`, ranked by shared tags then recency).

**Uploads**: presigned-PUT pattern — browser POSTs `{ pathname, contentType, contentLength }` to `/api/admin/blog/upload-token`; server validates auth + body and returns `{ uploadUrl, publicUrl, key }`; browser PUTs the file directly to MinIO. `parseBlogAssetPath` rejects anything that isn't `blog/<valid-slug>/<safe-filename>`. The reserved `post.md` cannot be uploaded or deleted via the explorer.

## CV

Primary path: `/core/cv` → pick a PDF → **Upload**. Same presigned-PUT flow as blog assets, target key `cv/current.pdf`. `/api/cv` does a `HeadObject` and 302-redirects to the public URL.

## Deployment

Production runs on a k3s VPS — a single Bun container behind Traefik with cert-manager handling Let's Encrypt, alongside in-cluster Mongo and MinIO StatefulSets. `deployment/Dockerfile` builds the app image and `deployment/k8s/` holds the manifests; `secrets.example.yaml` is a template (the filled-in `secrets.yaml` is gitignored).

## CI/CD

`.github/workflows/docker-publish.yml` builds and pushes the image to GHCR on every push to `master` and on manual `workflow_dispatch`. Tags: `:latest` (default branch only), `:sha-<short>`, `:<branch>`. Uses the built-in `GITHUB_TOKEN` — no PAT required, GHA-backed build cache. Doc-only and manifest-only changes don't trigger a rebuild.

## Path alias

`@/` → `src/` (`vite.config.ts` and `tsconfig.app.json`). The Express server doesn't use `@/` — it imports `src/shared/...` via relative paths.
