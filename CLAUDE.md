# CLAUDE.md — project context for Claude Code

**Project:** AI Content Marketing Suite — a SaaS that generates marketing copy
(blog / LinkedIn / ad / email) and a matching AI image per post, with a history
dashboard and a content improver. Magna Labs 48-hour assessment.

## Non-negotiables
- **All AI logic is server-side.** No LLM or image API calls from client
  components. The browser only calls `/api/*` route handlers. No `NEXT_PUBLIC_*`
  secret ever.
- **Model:** Claude `claude-sonnet-5` via `@anthropic-ai/sdk`. Use structured
  output (`output_config.format` with a JSON schema) — no assistant prefill, no
  `temperature` (rejected on Sonnet 5), `thinking: { type: "disabled" }` for the
  short generation calls. Assert array counts (e.g. exactly 3 ad variants) in code.
- **Images:** OpenAI image API. Because model access varies per account, use a
  resilience **fallback chain** — `gpt-image-1 → dall-e-3 → dall-e-2` (an optional
  `OPENAI_IMAGE_MODEL` is tried first) — falling through only on availability/
  verification errors. Normalize `b64_json`/`url` to base64, upload to Vercel Blob,
  store the **permanent Blob URL** — never the expiring model URL.
- **Identity:** anonymous `sessionId` httpOnly cookie; scope every DB read/write
  with `where: { id, sessionId }`.

## Conventions
- App Router, `src/` dir, import alias `@/*` → `./src/*`.
- Route handlers: `export const runtime = "nodejs"`. Validate input with zod at
  the boundary; return one error envelope `{ error: { code, message, requestId } }`.
- Data: a single `Generation` model (see `prisma/schema.prisma`) holds both
  content and improvements; image fields live on the row.

## Structure
- `src/app/api/*` — REST endpoints (the backend)
- `src/lib/*` — `db` (Prisma singleton), `ai/*`, `session`, `validation`, `http`
- `prisma/schema.prisma` — data model

## Build order
git init → scaffold → Neon + init migration → lib foundations → `/api/health` +
deploy → content generator (25 pts) → image pipeline (20 pts) → improver +
history → bonus + docs + video.
