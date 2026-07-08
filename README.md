# AI Content Marketing Suite

A production-feeling SaaS that helps marketers **create, manage, and optimize
content with AI** — generate copy across formats, pair each post with a matching
AI image, refine existing text, and keep it all in a per-session history. Every
AI call runs **server-side** behind clean REST endpoints; the browser never sees
an API key.

> Built for the Magna Labs 48-hour technical assessment.

- **Live:** https://magna-test-ten.vercel.app
- **Repo:** https://github.com/ahmed-farahat-pro/magna-test
- **Architecture note:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · also in-app at `/architecture`
- **Claude Code workflow:** [`docs/claude-code/`](./docs/claude-code/) — steering doc, prompt log, and the committed multi-agent review/grading workflow scripts

---

## Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **AI content generator** | Blog post · LinkedIn · ad copy · email — each a distinct prompt strategy. Copy **streams token-by-token** as Claude writes. |
| 2 | **Content-aware AI image** | An "art director" step reads the *generated copy* and turns it into a concrete scene, rendered in your chosen style, then re-hosted on Vercel Blob. |
| 3 | **Content improver** | Refine any text toward a goal (shorter / persuasive / formal / SEO / re-audience) with a "what changed" note. |
| 4 | **History dashboard** | Everything is saved per session — view, copy, delete, and **export to Text / Word / PDF** (with the image embedded). |
| 5 | **Brand voice** *(bonus)* | Save voices (personality, formality, industry, keywords, words to avoid), apply one per generation, and **hard-enforce** the "avoid" list. |
| 6 | **Accounts & cross-device sync** | Email + password; anonymous work **migrates onto your account** on sign-up and follows you across devices. |
| 7 | **Admin dashboard** *(bonus)* | Env-gated operator view: traffic, usage-by-type, per-user spend, user management, and landing-video control. |
| 8 | **Content moderation** | Harmful requests are blocked up front; Claude's own refusals are caught and surfaced cleanly. |
| 9 | **Token & cost tracking** *(bonus)* | Per-piece model, tokens & USD cost — shown in History and rolled up per user in the admin. |
| 10 | **Abuse hardening** | Client double-click guard on every AI button + a server per-session one-in-flight-AI-call lock. |
| 11 | **Self-running landing demo** *(bonus)* | An automated tour of the whole app on the landing page. |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** |
| Styling | **Tailwind CSS v4** |
| Text AI | **Anthropic Claude `claude-sonnet-5`** via `@anthropic-ai/sdk` (structured output, streaming) |
| Image AI | **OpenAI images** (`gpt-image-1` → `dall-e-3` → `dall-e-2` fallback chain) |
| Image hosting | **Vercel Blob** (permanent URLs; private-store proxy at `/api/img`) |
| Database | **Neon Postgres** via **Prisma 6** |
| Identity | Anonymous **signed session cookie** (HMAC, Edge middleware) |
| Validation | **zod** at every route boundary |
| Export | **jsPDF** + **docx** (client-side, dynamic import) |
| Hosting | **Vercel** (`main` auto-deploys) |

---

## Getting Started

```bash
npm install
cp .env.example .env.local     # fill in your keys (see below)
npm run db:migrate:dev         # create tables in your Neon database
npm run dev                    # http://localhost:3000
```

Build & run production locally:

```bash
npm run build && npm start
```

### Environment Variables

Set these in `.env.local` locally, and in **Vercel → Settings → Environment
Variables** for production.

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude — content generation, improver, image art-director |
| `OPENAI_API_KEY` | OpenAI image generation |
| `DATABASE_URL` | Neon **pooled** connection (host contains `-pooler`) — app runtime |
| `DIRECT_URL` | Neon **direct** connection — used by `prisma migrate` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — permanent image hosting |
| `SESSION_SECRET` | HMAC secret that signs the session cookie (**required in production** — the app fails closed without it) |
| `OPENAI_IMAGE_MODEL` | *(optional)* pin a specific image model, tried before the fallback chain |
| `UPSTASH_REDIS_REST_URL` | *(optional)* durable, multi-instance rate limiting — falls back to in-memory if unset |
| `UPSTASH_REDIS_REST_TOKEN` | *(optional)* paired with the URL above |

---

## Architecture (short)

Next.js **route handlers under `src/app/api/*` are the REST backend** — one deploy
unit, no separate server, and every secret stays server-side. Identity is an
anonymous, HMAC-signed `sessionId` cookie minted by Edge middleware; every DB read
and write is scoped `where: { id, sessionId }`. Image URLs from the model expire,
so images are downloaded as base64 and re-hosted on **Vercel Blob** for permanent
history URLs.

```
Browser (React, no API keys)
        │  fetch /api/*
        ▼
Edge middleware ── signs the session cookie
        │
        ▼
/api/generate · /api/images · /api/improve · /api/history · /api/img
        │  (zod validate · rate-limit · session)
        ▼
lib: ai/generate · ai/image · validation · session · rateLimit · db · blob · export
        │
        ▼
Claude (Anthropic) · OpenAI images · Vercel Blob · Neon Postgres
```

Full design choices, trade-offs, and what's next: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**.

---

## API Documentation

All endpoints run on the Node.js runtime. Requests and responses are JSON unless
noted. Errors use one envelope; identity comes from the session cookie (sent
automatically by the browser).

### Conventions

**Error envelope** — every failure returns:

```json
{ "error": { "code": "RATE_LIMITED", "message": "…human, declarative…", "requestId": "req_…", "details": [{ "path": "ai", "message": "rate_limit" }] } }
```

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Body/query failed zod validation |
| `UNAUTHORIZED` | 401 | Not signed in / bad credentials (auth + admin routes) |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeds the size guard |
| `CONTENT_BLOCKED` | 422 | Moderation blocked the request, or the model refused |
| `RATE_LIMITED` | 429 | Rate limit hit (`Retry-After` header set) |
| `CONCURRENT_REQUEST` | 429 | Another AI request from this session is already in flight |
| `NOT_FOUND` | 404 | Entry missing **or** owned by another session (no enumeration signal) |
| `METHOD_NOT_ALLOWED` | 405 | Unsupported HTTP method for the route |
| `CONFIG_ERROR` | 503 | Server not configured — missing key, invalid key, or out of quota |
| `UPSTREAM_LLM_ERROR` | 502 | Claude failed (overloaded, timeout, refusal, 5xx…) |
| `UPSTREAM_IMAGE_ERROR` | 502 | Image model failed (content policy, bad request, 5xx…) |
| `UPSTREAM_BLOB_ERROR` | 502 | Image saved-but-not-stored / attach failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

AI failures are **declarative**: the `message` says *what* went wrong and whether
a retry helps (rate-limit/overloaded → retry; auth/quota → config fix; content
policy → rephrase). A stable machine sub-reason is in `details[0].message`.

**Rate limits** — sliding window, **Upstash Redis** when configured (durable
across serverless instances), per-instance in-memory fallback otherwise:

- `generate` = 20/min per session — shared by `/api/generate`, `/api/improve`, `/api/enforce-voice`
- `image` = 12/min per session — `/api/images`
- `auth` = 10/min per **client IP** — `/api/auth/*` and `/api/admin/login` (IP-keyed so dropping the cookie can't bypass it)

**Concurrency lock** — at most **one in-flight AI request per session**. A second
concurrent call to `/api/generate` · `/api/improve` · `/api/images` ·
`/api/enforce-voice` is refused with `429 CONCURRENT_REQUEST` rather than fanned
out into another billable model call.

**Enums**

- `tone`: `professional` · `casual` · `witty` · `authoritative` · `friendly` · `bold`
- `contentType`: `blog_post` · `linkedin_post` · `ad_copy` · `email`
- `style` (image): `photographic` · `3d_render` · `flat_illustration` · `minimalist` · `bold_gradient` · `editorial`
- `goal` (improve): `shorter` · `more_persuasive` · `more_formal` · `seo_optimized` · `rewrite_for_audience`

---

### Endpoint index

Every endpoint, by area. Detailed request/response shapes follow below.
**Auth**: `session` = anonymous session cookie (auto-sent); `account` = a
signed-in account cookie; `admin` = the admin cookie; `IP` = IP-rate-limited;
`public` = no auth; `capability` = the unguessable path is the access token.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/generate` | Generate content (streaming) | session |
| `POST` | `/api/images` | Generate + attach a content-aware image | session |
| `POST` | `/api/improve` | Refine text toward a goal | session |
| `POST` | `/api/enforce-voice` | Hard-remove a brand's "avoid" words | session |
| `GET` | `/api/brand-voice` | List saved brand voices | session |
| `POST` | `/api/brand-voice` | Create a brand voice | session |
| `PUT` | `/api/brand-voice/:id` | Update a brand voice | session |
| `DELETE` | `/api/brand-voice/:id` | Delete a brand voice | session |
| `GET` | `/api/history` | List your session's work (`?kind=`, paged) | session |
| `GET` | `/api/history/:id` | One entry (full fields) | session |
| `DELETE` | `/api/history/:id` | Delete an entry (+ its Blob image) | session |
| `POST` | `/api/auth/signup` | Create an account | public · IP |
| `POST` | `/api/auth/login` | Sign in | public · IP |
| `POST` | `/api/auth/logout` | Sign out | account |
| `GET` | `/api/auth/me` | Current account (or `null`) | public |
| `POST` | `/api/admin/login` | Admin sign in (env credentials) | public · IP |
| `POST` | `/api/admin/logout` | Admin sign out | admin |
| `GET` | `/api/admin/stats` | Dashboard metrics (traffic, usage, spend) | admin |
| `GET` | `/api/admin/users` | List users + per-user spend | admin |
| `DELETE` | `/api/admin/users/:id` | Delete a user (cascade) | admin |
| `GET` | `/api/admin/video` | Read the landing-video setting | admin |
| `POST` | `/api/admin/video` | Set / clear the landing video | admin |
| `GET` | `/api/video` | Public landing-video embed | public |
| `POST` | `/api/track/visit` | Count one anonymous visit (dedup) | session |
| `GET` | `/api/health` | Readiness probe | public |
| `GET` | `/api/img?p=` | Stream a private Blob image | capability |

---

### `POST /api/generate` — generate content (streaming)

Streams the copy as `text/plain`, token-by-token, then a **record-separator**
byte (`U+001E`) followed by a JSON trailer.

**Body**

```jsonc
{
  "topic": "How small teams can automate invoicing",  // required, ≤200
  "tone": "witty",                                     // required, enum
  "audience": "B2B SaaS founders",                     // required, ≤120
  "contentType": "blog_post",                          // required, enum
  "brandVoice": {                                      // optional (bonus)
    "name": "Acme Co.",
    "personality": ["Witty", "Confident", "Warm"],     // optional, ≤12
    "formality": "Casual",                             // optional
    "industry": "SaaS / fintech",                      // optional
    "description": "Plain-spoken, jargon-free.",        // optional, ≤500
    "keywords": ["cash flow", "on autopilot"],          // optional, ≤20
    "avoid": ["synergy", "leverage", "world-class"]     // optional, ≤20
  }
}
```

**Response** — the streamed text, then `␞` + trailer:

```jsonc
// success trailer
{ "id": "cmr…", "contentType": "blog_post", "saved": true,
  "avoided": [],                                   // any brand "avoid" words that slipped in
  "usage": { "model": "claude-sonnet-5", "inputTokens": 812, "outputTokens": 640,
             "tokensUsed": 1452, "costUsd": 0.0121 } }
// or, on AI failure / content block mid-stream
{ "error": "The AI writer is temporarily overloaded. Please retry in a moment.", "code": "overloaded", "retryable": true }
```

Validation / rate-limit / concurrency / moderation / config errors return the JSON
**error envelope** with a non-200 status *before* streaming begins.

---

### `POST /api/images` — generate & attach an image

Builds a **content-aware** prompt (Claude reads the copy → a concrete scene),
renders it via the image-model fallback chain, and re-hosts the PNG on Vercel
Blob. Prefers the stored generation (`where: { id, sessionId }`) as the subject.

**Body**

```jsonc
{
  "generationId": "cmr…",   // optional — attaches the image to that piece
  "content": "…the copy…",  // optional — fallback subject if DB is offline
  "topic": "…", "tone": "…", "contentType": "blog_post",  // optional
  "scene": "A steel bottle on a desk…",  // optional — pass back on a restyle to keep the subject
  "style": "photographic"   // required, enum
}
```

**Response**

```jsonc
{
  "imageUrl": "/api/img?p=images%2F….png",  // private-store proxy path (or a public Blob URL)
  "prompt": "A photorealistic scene showing…",
  "style": "photographic",
  "saved": true,             // attached to a generation row
  "enhanced": true,          // true = the content-aware art-director step ran
  "scene": "A steel water bottle on a tidy desk…",  // send back as `scene` on a restyle
  "usage": { "model": "gpt-image-1", "costUsd": 0.04 }
}
```

---

### `POST /api/improve` — refine text toward a goal

**Body**

```jsonc
{
  "text": "…paste up to 12,000 chars…",  // required
  "goal": "more_persuasive",             // required, enum
  "targetAudience": "CFOs"               // required only when goal = rewrite_for_audience
}
```

**Response**

```jsonc
{
  "id": "cmr…",
  "goal": "more_persuasive",
  "improved": "…rewritten text…",
  "changeSummary": "Sharpened the hook and added a concrete benefit.",
  "saved": true,
  "usage": { "model": "claude-sonnet-5", "inputTokens": 812, "outputTokens": 640,
             "tokensUsed": 1452, "costUsd": 0.0121 }
}
```

---

### `GET /api/history?page=1&pageSize=12&kind=GENERATE` — list your session's work

Optional `kind` filters to `GENERATE` or `IMPROVE` (the Improve tab uses
`kind=IMPROVE` for its in-context history). `pageSize` is clamped to `[1, 50]`.
Scoped to your session only.

```jsonc
{
  "items": [
    { "id": "cmr…", "kind": "GENERATE", "contentType": "BLOG_POST", "topic": "…",
      "improveGoal": null, "sourceText": null, "outputText": "…", "explanation": null,
      "imageUrl": "/api/img?p=…", "imageStyle": "photographic",
      "model": "claude-sonnet-5", "tokensUsed": 1452, "costUsd": 0.0121,
      "createdAt": "2026-…" }
  ],
  "page": 1, "pageSize": 12, "total": 10, "hasMore": false,
  "spend": { "costUsd": 0.1148, "tokensUsed": 3910 }   // your lifetime session spend
}
```

### `GET /api/history/:id` — one entry

Returns `{ item }` (full fields incl. `sourceText`, `imagePrompt`) or
`NOT_FOUND` — **the same response for a missing id and one owned by another
session**, so ids can't be enumerated.

### `DELETE /api/history/:id` — delete an entry

Returns `{ "deleted": { "id": "cmr…" } }` and best-effort deletes its Blob image.

### `GET /api/health` — readiness probe

Never throws — safe to hit before env vars exist.

```jsonc
{ "ok": true, "service": "ai-content-marketing-suite", "db": "connected",
  "rateLimit": "upstash",                          // or "memory" (fallback)
  "env": { "anthropic": "set", "openai": "set", "blob": "set", "database": "set",
           "sessionSecret": "set", "admin": "set" },
  "timestamp": "2026-…" }
```

### `GET /api/img?p=<path>` — private image proxy

Streams a **private** Blob image server-side (browsers can't load private blobs
directly). `p` must match `images/<uuid>.png`; the unguessable UUID path *is* the
access capability. `imageUrl` points here when the Blob store is private.

---

## Content improver's siblings — brand voice *(bonus)*

Brand voices are stored **server-side** (source of truth), scoped `where: { sessionId }`,
capped per session. The browser only remembers which one is *selected*.

### `GET /api/brand-voice` — list your voices

Returns `{ "voices": [ { "id": "cmr…", "name": "Acme Co.", "personality": ["Witty"], "formality": "Casual", "industry": "SaaS", "description": "…", "keywords": ["…"], "avoid": ["synergy"] } ] }` (empty array before the DB is configured).

### `POST /api/brand-voice` — create a voice

**Body**: a brand-voice object (`name` required ≤60; `personality` ≤12, `keywords`/`avoid` ≤20, `description` ≤500 — all optional). Returns `{ "voice": { "id": "cmr…", … }, "saved": true }`. Over the per-session cap → `VALIDATION_ERROR`.

### `PUT /api/brand-voice/:id` — update a voice

Same body shape. Returns `{ "voice": { "id": "cmr…", … } }`, or `NOT_FOUND` if the id isn't yours.

### `DELETE /api/brand-voice/:id` — delete a voice

Returns `{ "deleted": { "id": "cmr…" } }`, or `NOT_FOUND` if the id isn't yours.

### `POST /api/enforce-voice` — hard-remove "avoid" words *(bonus)*

Rewrites copy to strip a brand's banned words, then reports any that survived
(honest, not a false guarantee). Shares the `generate` rate-limit bucket + the
per-session concurrency lock.

**Body**: `{ "generationId": "cmr…" (optional, updates that row in place), "text": "…", "avoid": ["synergy", "leverage"] }`
**Response**: `{ "text": "…rewritten…", "remaining": [] }` (`remaining` = avoid words still present).

---

## Authentication

Email + password accounts (scrypt hash, 7-day signed cookie). Signing up / in
**migrates your anonymous work onto the account** in one transaction, so history
follows you across devices. No user-enumeration; **IP-rate-limited**;
disposable-email addresses are blocked.

### `POST /api/auth/signup` — create an account

**Body**: `{ "email": "you@work.com", "password": "≥8 chars" }` (password strength also enforced server-side). Returns `{ "user": { "email": "you@work.com" } }` and sets the account cookie. Duplicate email → `VALIDATION_ERROR`; disposable inbox → `VALIDATION_ERROR`.

### `POST /api/auth/login` — sign in

**Body**: same shape. Returns `{ "user": { "email": "…" } }`. Wrong credentials → **generic** `VALIDATION_ERROR` ("Invalid email or password.") — the same message whether the email exists or not.

### `POST /api/auth/logout` — sign out

Clears the account **and** anonymous cookies (a shared browser can't inherit the previous person's session). Returns `{ "ok": true }`.

### `GET /api/auth/me` — current account

Returns `{ "user": { "email": "…" } }` or `{ "user": null }`. Sent `no-store` so a cached pre-login `null` never sticks the header on "Sign in".

---

## Landing video

### `GET /api/video` — public landing-video embed

Returns `{ "videoId": "<drive-file-id>" | null, "embedUrl": "https://drive.google.com/file/d/<id>/preview" | null }`. Set by an admin (below) from a Google Drive share link; shows on the landing page when present.

---

## Activity tracking

### `POST /api/track/visit` — count one anonymous visit

Records a single `session_start` per browser (deduped by a one-year `acms_visit`
cookie); skipped for logged-in users. **Gated on cookie consent** — the client
only calls it once you *accept* the banner. Always returns `{ "tracked": true | false }`
(best-effort; never surfaces an error to the user).

---

## Admin API *(env-gated — `ADMIN_USERNAME` / `ADMIN_PASSWORD`)*

A single operator account, no admin table. Credentials are checked in constant
time; the session is a signed `admin` cookie. Every route below returns
`UNAUTHORIZED` without it.

### `POST /api/admin/login` — sign in

**Body**: `{ "username": "…", "password": "…" }` (IP-rate-limited). Returns `{ "ok": true }` + the admin cookie, or `VALIDATION_ERROR` on bad credentials.

### `POST /api/admin/logout` — sign out

Returns `{ "ok": true }`.

### `GET /api/admin/stats` — dashboard metrics

```jsonc
{
  "overview": { "users": 2, "anonymousSessions": 14, "totalActions": 61,
    "textRequests": 30, "imageRequests": 12, "improveRequests": 9,
    "brandVoices": 3, "generationsStored": 40, "imagesStored": 12,
    "logins": 0, "signups": 2, "totalSpendUsd": 0.83, "totalTokens": 41207 },
  "totalsByType": { "text_generate": 30, "image_generate": 12, "…": 0 },
  "actionsByActor": { "user": 21, "anon": 40 },
  "perDay":  [ { "day": "2026-07-08", "users": 5, "anon": 12, "count": 17 } ],
  "recent":  [ { "id": "cmr…", "type": "text_generate", "isUser": false,
                 "actor": "72f1bb3e", "meta": {…}, "createdAt": "2026-…" } ]
}
```

### `GET /api/admin/users` — list users + spend

```jsonc
{ "users": [ { "id": "cmr…", "email": "…", "createdAt": "2026-…",
               "generations": 12, "actions": 20, "costUsd": 0.42, "tokensUsed": 21030 } ],
  "totalSpend": 0.83 }
```

### `DELETE /api/admin/users/:id` — delete a user (cascade)

Deletes the account and all its content in one transaction. Returns
`{ "deleted": { "id": "cmr…", "generations": 12, "brandVoices": 2, "activityEvents": 20 } }`.

### `GET /api/admin/video` — read the landing-video setting

Returns `{ "url": "https://drive.google.com/file/d/…/view" | null, "videoId": "<drive-file-id>" | null, "embedUrl": "https://drive.google.com/file/d/<id>/preview" | null }`.

### `POST /api/admin/video` — set / clear the landing video

**Body**: `{ "url": "https://drive.google.com/file/d/…/view (or empty to clear)" }`. Validates it's a Google Drive link (the file must be shared “Anyone with the link”). Returns the same shape as the GET. Drives the public `/api/video`.

---

## Project Structure

```
src/
  app/
    api/*            REST endpoints (the backend)
    page.tsx         landing + self-running demo
    create/          the generator
    improve/ history/ settings/ architecture/
  components/*       Generator, Improver, History, AutoDemo, Architecture, …
  lib/
    ai/*             generate · image · improve · errors · config
    db · session · validation · http · rateLimit · blob · export · brandVoice
  middleware.ts      mints the signed session cookie
prisma/schema.prisma single Generation model (content + improvements + image fields)
```

## Deployment

Push to GitHub → import the repo on Vercel → add the environment variables above →
create a Blob store and a Neon database → deploy. The `main` branch auto-deploys.
