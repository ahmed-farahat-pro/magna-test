# AI Content Marketing Suite

A production-feeling SaaS that helps marketers **create, manage, and optimize
content with AI** — generate copy across multiple formats, pair each post with a
matching AI image, refine existing text, and keep it all in a searchable history.
Every AI call runs **server-side** behind clean REST endpoints; the browser never
sees an API key.

> Built for the Magna Labs 48-hour technical assessment.

- **Live URL:** _to be added after the first Vercel deploy_
- **Status:** deploy pipeline live · core generator shipping next

## Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **AI Content Generator** | Blog post · LinkedIn post · ad copy · email — each a distinct prompt strategy |
| 2 | **Per-post AI Image** ★ | Auto-builds a visual prompt from topic + tone, calls DALL·E 3, pairs it with the text, regenerate by style |
| 3 | **History & Dashboard** | Every generation saved per session — view, copy, download, delete; paginated |
| 4 | **Content Improver** | Refine pasted text toward a goal (shorter / persuasive / formal / SEO / re-audience) + a "what changed" note |
| 5 | **REST API** | All AI + storage behind documented server-side endpoints |

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma · Neon Postgres ·
Anthropic Claude (`claude-sonnet-5`) · OpenAI DALL·E 3 · Vercel Blob · Vercel hosting.

## Architecture

Next.js **route handlers under `src/app/api/*` are the REST backend** — one deploy
unit, no separate server, and secrets stay server-side. Identity is an anonymous
`sessionId` cookie (no login). DALL·E image URLs expire in ~1h, so images are
downloaded as base64 and re-uploaded to **Vercel Blob** for permanent history URLs.

```
Browser (React UI)  ──fetch()──▶  /api/* route handlers  ──▶  Anthropic · OpenAI · Vercel Blob · Neon (Prisma)
        no API keys client-side              server-side only
```

## Getting Started

```bash
npm install
cp .env.example .env.local     # fill in your keys (see below)
npm run db:migrate:dev         # create tables in your Neon database
npm run dev                    # http://localhost:3000
```

## Environment Variables

Set these in `.env.local` locally, and in **Vercel → Settings → Environment
Variables** for production. See `.env.example` for the annotated template.

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude — content generation + improver |
| `OPENAI_API_KEY` | DALL·E 3 image generation |
| `DATABASE_URL` | Neon **pooled** connection (host contains `-pooler`) — app runtime |
| `DIRECT_URL` | Neon **direct** connection — used by `prisma migrate` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — permanent image hosting |
| `SESSION_COOKIE_NAME` | Name of the anonymous session cookie (e.g. `acms_sid`) |
| `SESSION_SECRET` | HMAC secret that signs the session cookie |

## API Documentation

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| `GET`  | `/api/health` | — | Service + DB + env status |
| `POST` | `/api/generate` | `{ topic, tone, audience, contentType }` | `{ id, contentType, outputText, saved }` |
| `POST` | `/api/images` | `{ generationId?, topic?, tone?, contentType?, style }` | `{ imageUrl, prompt, style }` |
| `POST` | `/api/improve` | `{ text, goal }` | Refined text + explanation _(coming)_ |
| `GET`  | `/api/history` | `?page=` | Paginated session feed _(coming)_ |
| `DELETE` | `/api/history/:id` | — | Deletes row + image _(coming)_ |

## Deployment

Push to GitHub → import the repo on Vercel → add the environment variables above →
create a Blob store → deploy. The `main` branch auto-deploys on every push.
