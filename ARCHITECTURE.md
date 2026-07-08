# Architecture Note

_AI Content Marketing Suite — design choices, trade-offs, and what's next. One page._

## Design choices

- **The API *is* the backend.** Next.js route handlers under `src/app/api/*` are
  the REST layer — one deploy unit, no separate server, and every AI/storage
  secret stays server-side. The browser only ever calls `/api/*`.
- **One `Generation` model** holds both generated content *and* improvements, with
  the image fields on the same row. A single table means one history query, one
  ownership rule, and no joins.
- **Two-layer identity, one owner id.** An HMAC-signed anonymous `sessionId`
  cookie is minted by Edge middleware (zero-friction, forgery-resistant); signing
  up adds an **email + password account** (scrypt hash, 7-day signed token). A
  single `getActor()` collapses both into one owner id, so every read/write stays
  scoped `where: { id, sessionId }` unchanged — and anonymous work is **migrated**
  onto the account in one transaction at sign-up.
- **Observability without a vendor.** An append-only `ActivityEvent` log records
  each meaningful action (a new anonymous session, a text/image/improve, a
  signup/login). A password-gated **admin dashboard** aggregates it into traffic,
  usage-by-type, a 14-day chart, the user-vs-anonymous split, and per-user counts —
  and can delete a user (cascading their content). Writes are best-effort, so
  analytics can never slow or break a user-facing action.
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
- **Abuse-resistant AI calls (two layers).** Every AI/backend button carries a
  synchronous in-flight guard (`useInFlight`), so a double-tap — or a scripted
  `.click()` loop — never fires the same call twice. On the server, a **per-session
  concurrency lock** (`concurrency.ts`, Redis `SET NX PX` with an in-memory
  fallback) allows only one in-flight AI request per session; a second concurrent
  request is refused `429 CONCURRENT_REQUEST` instead of fanning out into another
  billable model call. This is distinct from rate limiting: the sliding window caps
  *volume over time*, the lock caps *simultaneity*. Released in a `finally` (inside
  the stream's `finally` for `/api/generate`), with a TTL so a dead request can't
  wedge the session shut.

## Trade-offs

- **Single operator admin, credentials in env.** The admin is one `ADMIN_USERNAME`
  / `ADMIN_PASSWORD` account — no admin table, nothing to seed or leak — at the
  cost of no per-admin roles or audit-of-admins. Right-sized for this scope.
- **Client-side export (jsPDF / docx), no server render service.** No extra infra,
  and dynamic imports keep it out of the initial bundle — but it runs in the
  browser. Word needs a real `.docx` (the `docx` lib), because HTML-in-`.doc`
  won't render embedded data-URI images in Word desktop.
- **An extra Claude call for images** adds latency and cost; it's bounded with an
  8-second timeout so a slow art-director step can't block the request.

## What I'd build next (with more time)

- **Business memory (a RAG layer)** — index each brand's past posts, emails, and
  LinkedIn content into a vector store, retrieve the closest real examples at
  generation time, and feed them to the model so the output matches how that
  specific business actually writes — not just a described voice. Not built yet,
  purely a time constraint.
- **A Canva-style overlay** to place and style text directly on top of the
  generated photos — headlines, captions, CTAs baked into the image.
- **A small in-browser photo editor** — crop, filters, brightness/contrast, and
  background tweaks on the generated image without leaving the app.
- **Richer text styling in generation** — choose fonts, sizes, and weights so the
  copy can be exported already-styled, as an extra layer on top of the content.
- **Team workspaces & roles** — shared brand voices and history across a team,
  per-seat permissions, and multiple admins with an audit trail.

> Since the first cut, several former trade-offs have been closed:
> **email + password accounts** (with anonymous-work migration on sign-up, plus
> disposable-email blocking and a password-strength meter), an **admin dashboard**
> with full activity tracking and user management, **durable rate limiting**
> (Upstash Redis with an in-memory fallback), **server-side, multiple brand
> voices** (create / edit / delete, pick one per generation), **hard
> "avoid"-word enforcement** (detect + one-click rewrite), and **abuse hardening**
> (client double-submit guards + a per-session AI-concurrency lock).
