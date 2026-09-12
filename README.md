# Rashidi Import & Export — الراشيدي للاستيراد والتصدير

Corporate website and catalogue for an industrial machinery import/export company.
Bilingual (English / Arabic with full RTL), with an admin dashboard so the company
can publish machines, photographs and site copy without touching the code.

```
Rashidi-Web/
├── backend/     Node.js + Express + Prisma + PostgreSQL REST API
└── frontend/    Angular 20 website + admin dashboard
```

---

## Stack

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Frontend   | Angular 20 (standalone components, signals, lazy routes)                |
| 3D         | Three.js — deferred, never blocks the hero                              |
| Animation  | GSAP + ScrollTrigger                                                    |
| Backend    | Node.js + Express 4                                                     |
| Database   | PostgreSQL + Prisma 6                                                   |
| Auth       | JWT access + refresh tokens, bcrypt hashes                              |
| Storage    | Pluggable — local disk by default, any S3-compatible bucket in production |
| Images     | `sharp` — WebP at two sizes plus a base64 blur placeholder, on upload   |

---

## Quick start

**Prerequisites:** Node 20+, PostgreSQL 14+.

### 1. Database

Create an empty database:

```sql
CREATE DATABASE rashidi;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` — at minimum set `DATABASE_URL` and generate the two JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create the schema and load the starter catalogue:

```bash
npm run prisma:generate
npm run prisma:deploy     # applies prisma/migrations
npm run db:seed           # categories, 10 machines, all site copy, admin user
npm run dev               # http://localhost:4000
```

The seed prints the admin credentials it created. Change the password from the
dashboard before going live.

> On a fresh database you can use `npm run db:push` instead of `prisma:deploy`
> to skip migration history entirely.

### 3. Frontend

```bash
cd frontend
npm install
npm start                 # http://localhost:4200
```

`src/environments/environment.ts` points at `http://localhost:4000/api` for
development. Edit `environment.production.ts` before a production build.

---

## What the admin can change without a developer

Sign in at `/admin`.

| Area            | Covers                                                                              |
| --------------- | ----------------------------------------------------------------------------------- |
| **Machinery**   | Add / edit / delete, availability status, publish or keep as draft, feature on home  |
| **Photographs** | Upload many per machine, pick the main image, set alt text per language, delete      |
| **Documents**   | Datasheets and manuals offered for download on the machine page                      |
| **Specs**       | Unlimited label/value rows in both languages, optionally grouped                      |
| **Categories**  | Create, rename, reorder — these drive the catalogue filters and the footer           |
| **Site content**| Home headline and CTAs, key figures, capabilities, About copy, contact details, social links, footer, SEO defaults |
| **Enquiries**   | Inbox with statuses (new / read / replied / archived) and one-click email reply      |

Site copy lives in the `SiteContent` table as JSON per language. The content editor
reads the *shape* of each stored block and renders controls to match, so adding a
field to the seed makes it editable in the dashboard with no frontend change.

---

## API

Base URL `/api`. Admin routes require `Authorization: Bearer <accessToken>`.

```
POST   /auth/login                          public
POST   /auth/refresh                        public
GET    /auth/me                             auth
POST   /auth/change-password                auth

GET    /machines                            public  (page, pageSize, search, category, status, featured, sort)
GET    /machines/:idOrSlug                  public
POST   /machines                            auth
PUT    /machines/:id                        auth
DELETE /machines/:id                        auth
PATCH  /machines/:id/status                 auth

POST   /machines/:id/images                 auth    multipart, field `images`
PATCH  /machines/:id/images/:imageId        auth
PUT    /machines/:id/images/reorder         auth
DELETE /machines/:id/images/:imageId        auth

POST   /machines/:id/documents              auth    multipart, field `documents`
DELETE /machines/:id/documents/:documentId  auth

GET    /categories                          public
POST   /categories                          auth
PUT    /categories/reorder                  auth
PUT    /categories/:id                      auth
DELETE /categories/:id                      auth

GET    /content                             public  (optional ?group=)
GET    /content/:key                        public
PUT    /content                             auth    one block or { items: [...] }
POST   /content/media                       auth    multipart, field `image`
DELETE /content/:key                        auth

POST   /contact                             public  rate limited
GET    /contact                             auth
GET    /contact/stats/overview              auth
GET    /contact/:id                         auth
PATCH  /contact/:id                         auth
DELETE /contact/:id                         auth

GET    /health                              public
```

Every response uses the same envelope:

```jsonc
{ "success": true,  "data": …, "meta": { … } }
{ "success": false, "error": { "message": "…", "details": [ … ] } }
```

---

## Storage

`STORAGE_DRIVER=local` (default) writes to `backend/uploads` and serves it from
the API — right for a single server. For anything horizontally scaled, switch to
`s3` and fill in the bucket credentials; the same code path works against AWS S3,
Cloudflare R2, DigitalOcean Spaces, Backblaze B2 and MinIO.

Uploaded photographs are processed once, on arrival:

- a WebP capped at 1920px for the gallery,
- a 640px WebP for cards and thumbnails,
- a 20px base64 LQIP stored on the row and used as the blur-up placeholder.

Nothing is resized at request time.

---

## Languages and RTL

English is the default; the switcher sits in the header. Switching sets `lang`
and `dir` on `<html>` and the choice is remembered.

RTL is not a translation layer — the stylesheet is written in logical properties
(`inset-inline-start`, `padding-inline`, `margin-inline-start`), so the layout
mirrors natively. A `--flip` custom property (`1` in LTR, `-1` in RTL) flips the
handful of things logical properties cannot reach: arrow icons, sweep directions,
transform origins, the mobile drawer's slide-in edge. Arabic also swaps to
*IBM Plex Sans Arabic* and drops the negative letter-spacing that suits Latin
display type but damages Arabic.

Machine and category records carry `...En` / `...Ar` columns, and the UI falls
back to the other language when one side is empty — a machine entered in English
only still renders in Arabic.

---

## Performance notes

- Every route is lazily loaded; the admin bundle never reaches a visitor.
- Three.js is behind `@defer (on idle)` — the hero headline paints and becomes
  interactive before the 3D chunk is even requested.
- The 3D scene skips initialisation entirely below 720px, under
  `prefers-reduced-motion`, or where WebGL is unavailable, and a composed
  CSS/SVG visual sits permanently behind the canvas so there is never a hole.
- Rendering pauses when the canvas scrolls out of view or the tab is hidden.
- All GSAP work runs outside Angular's zone, so a 60fps tween does not trigger
  60 change-detection passes per second.
- Images are lazy except the first three catalogue cards and the detail hero.

Production build: ~152 kB transferred initially.

---

## Project layout

```
backend/src
├── config/env.js          all configuration, validated at boot
├── lib/
│   ├── prisma.js
│   ├── image-processor.js sharp pipeline
│   ├── mailer.js          optional SMTP, degrades silently
│   └── storage/           local + s3 drivers behind one interface
├── middleware/            auth, validation, uploads, rate limits, errors
├── controllers/
├── routes/
├── validators/schemas.js  every request shape, in one file
└── server.js

frontend/src/app
├── core/                  models, services, guards, interceptors, i18n dictionaries
├── shared/                logo, machine card, status badge, image, 3D hero, toasts
├── layout/                intro screen, header, footer
├── pages/                 home, machinery, machine detail, about+contact, 404
└── admin/                 login, shell, dashboard, machines, form, categories,
                           content, messages, account
```

---

## Deployment

**Backend** — set `NODE_ENV=production`, a real `JWT_SECRET` (32+ chars),
`CORS_ORIGINS` to the website's origin, and `PUBLIC_URL` to the API's public URL.
Run `npm run prisma:deploy` on release. Put it behind a reverse proxy; the app
already trusts one proxy hop for correct client IPs.

**Frontend** — `npm run build` outputs to `frontend/dist/frontend/browser`. Serve
it as static files with an SPA fallback so deep links like
`/machines/pet-stretch-blow-molding-machine-6-cavity` resolve:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Point `/api` at the backend from the same origin and `environment.production.ts`
can keep its relative `apiUrl`, which avoids CORS in production entirely.

---

## Not included

- **No server-side rendering.** Titles, meta descriptions, Open Graph tags,
  canonical URLs and JSON-LD are all set per route on the client, which Google
  executes. If link-preview unfurling in WhatsApp or Facebook becomes a
  requirement, add Angular SSR — `SeoService` works unchanged under it.
- **No automated tests.** The Karma scaffold is present but no specs were written.
