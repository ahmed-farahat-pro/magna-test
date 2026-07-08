# Architecture Note

_AI Content Marketing Suite — design choices, trade-offs, and what's next. One page._

## Design choices

- **The API *is* the backend.** Next.js route handlers under `src/app/api/*` are
  the REST layer — one deploy unit, no separate server, and every AI/storage
  secret stays server-side. The browser only ever calls `/api/*`.
- **One `Generation` model** holds both generated content *and* improvements, with
  the image fields on the same row. A single table means one history query, one
  ownership rule, and no joins.
- **Anonymous, signed identity.** An HMAC-signed `sessionId` cookie is minted by
  Edge middleware — zero-friction (no login) yet forgery-resistant. Every read and
  write is scoped `where: { id, sessionId }`, so users can only touch their own data.
- **Streaming for perceived speed.** `/api/generate` streams copy token-by-token,
  then a record-separator byte and a small JSON trailer carry the saved id — so the
  UI feels instant instead of staring at a spinner.
- **Content-aware images.** Instead of prompting the image model from the topic
  string, an "art-director" Claude step reads the *finished copy* and distills it
  into one concrete scene; the user's chosen **style** then renders it. It always
  falls back to a deterministic prompt, so image generation never depends on it.
- **Permanence & resilience.** Model image URLs expire, so PNGs are re-hosted on
  Vercel Blob (with a `/api/img` proxy for private stores). The image model uses a
  **fallback chain** (`gpt-image-1 → dall-e-3 → dall-e-2`) to survive per-account
  availability differences.
- **Declarative failures.** A single classifier maps any AI/SDK/network error to a
  plain-language, actionable message (retry vs. config-fix vs. rephrase).

## Trade-offs

- **Anonymous session, not full auth.** Fast to build and demo, no signup
  friction — at the cost of no cross-device history and no accounts/teams.
- **Client-side export (jsPDF / docx), no server render service.** No extra infra,
  and dynamic imports keep it out of the initial bundle — but it runs in the
  browser. Word needs a real `.docx` (the `docx` lib), because HTML-in-`.doc`
  won't render embedded data-URI images in Word desktop.
- **An extra Claude call for images** adds latency and cost; it's bounded with an
  8-second timeout so a slow art-director step can't block the request.

## What I'd build next (with more time)

- **A Canva-style overlay** to place and style text directly on top of the
  generated photos — headlines, captions, CTAs baked into the image.
- **A small in-browser photo editor** — crop, filters, brightness/contrast, and
  background tweaks on the generated image without leaving the app.
- **Richer text styling in generation** — choose fonts, sizes, and weights so the
  copy can be exported already-styled, as an extra layer on top of the content.
- **Real auth + team workspaces** so brand voices and history follow the user
  across devices, with usage analytics for a true multi-tenant product.

> Since the first cut, several former trade-offs have been closed:
> **durable rate limiting** (Upstash Redis with an in-memory fallback),
> **server-side, multiple brand voices** (create / edit / delete, pick one per
> generation), and **hard "avoid"-word enforcement** (detect + one-click rewrite).
