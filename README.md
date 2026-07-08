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
| 5 | **Brand voice** *(bonus)* | Save a voice (personality, formality, industry, keywords, words to avoid) and apply it to generation. |
| 6 | **Self-running landing demo** *(bonus)* | An automated tour of the whole app on the landing page. |

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
| `RATE_LIMITED` | 429 | Per-session rate limit hit (`Retry-After` header set) |
| `CONFIG_ERROR` | 503 | Server not configured — missing key, invalid key, or out of quota |
| `UPSTREAM_LLM_ERROR` | 502 | Claude failed (overloaded, timeout, refusal, 5xx…) |
| `UPSTREAM_IMAGE_ERROR` | 502 | Image model failed (content policy, bad request, 5xx…) |
| `UPSTREAM_BLOB_ERROR` | 502 | Image saved-but-not-stored / attach failure |
| `NOT_FOUND` | 404 | Entry missing **or** owned by another session (no enumeration signal) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

AI failures are **declarative**: the `message` says *what* went wrong and whether
a retry helps (rate-limit/overloaded → retry; auth/quota → config fix; content
policy → rephrase). A stable machine sub-reason is in `details[0].message`.

**Rate limits** (in-memory, per session): `generate` = 20/min (shared by
`/api/generate` and `/api/improve`); `image` = 12/min.

**Enums**

- `tone`: `professional` · `casual` · `witty` · `authoritative` · `friendly` · `bold`
- `contentType`: `blog_post` · `linkedin_post` · `ad_copy` · `email`
- `style` (image): `photographic` · `3d_render` · `flat_illustration` · `minimalist` · `bold_gradient` · `editorial`
- `goal` (improve): `shorter` · `more_persuasive` · `more_formal` · `seo_optimized` · `rewrite_for_audience`

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
{ "id": "cmr…", "contentType": "blog_post", "saved": true }
// or, on AI failure mid-stream
{ "error": "The AI writer is temporarily overloaded. Please retry in a moment.", "code": "overloaded", "retryable": true }
```

Validation / rate-limit / config errors return the JSON **error envelope** with a
non-200 status *before* streaming begins.

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
  "style": "photographic"   // required, enum
}
```

**Response**

```jsonc
{
  "imageUrl": "https://…blob…/images/….png",  // or "/api/img?p=…" for a private store
  "prompt": "A photorealistic scene showing…",
  "style": "photographic",
  "saved": true,             // attached to a generation row
  "enhanced": true           // true = the content-aware art-director step ran
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
  "usage": { "inputTokens": 812, "outputTokens": 640 }
}
```

---

### `GET /api/history?page=1&pageSize=12` — list your session's work

```jsonc
{
  "items": [
    { "id": "cmr…", "kind": "GENERATE", "contentType": "BLOG_POST", "topic": "…",
      "improveGoal": null, "outputText": "…", "explanation": null,
      "imageUrl": "…", "imageStyle": "photographic", "createdAt": "2026-…" }
  ],
  "page": 1, "pageSize": 12, "total": 10, "hasMore": false
}
```

`pageSize` is clamped to `[1, 50]`. Scoped to your session only.

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
  "env": { "anthropic": "set", "openai": "set", "blob": "set", "database": "set", "sessionSecret": "set" },
  "timestamp": "2026-…" }
```

### `GET /api/img?p=<path>` — internal

Streams a **private** Blob image server-side (browsers can't load private blobs
directly). Not called by clients directly — `imageUrl` points here when the Blob
store is private; otherwise a direct public Blob URL is used.

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
