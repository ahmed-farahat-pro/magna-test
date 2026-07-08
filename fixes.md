# Remediation — what changed and why

After an independent multi-agent grading pass scored the build **89/100**, this
round closes the concrete gaps the examiners flagged. Every fix below is in the
code and **verified against the live deployment**.

| # | Area | Fix | Files |
|---|------|-----|-------|
| 1 | 🔒 Security | `SESSION_SECRET` **fails closed** in production | `sessionSecret.ts`, `session.ts`, `middleware.ts`, `health/route.ts` |
| 2 | 🔒 Security | `/api/img` only proxies validated `images/<uuid>.png` | `img/route.ts` |
| 3 | 🔒 Security | Request **body-size guard** on the AI routes | `http.ts` + `generate/images/improve` |
| 4 | LLM | **Array counts enforced in code** (schema + runtime) | `ai/generate.ts` |
| 5 | LLM | **Streaming path guard** — refuse to save junk | `ai/generate.ts`, `generate/route.ts` |
| 6 | Image | **Scene cached & reused on restyle** (same subject) | `ai/image.ts`, `images/route.ts`, `validation.ts`, `Generator.tsx` |
| 7 | Image | Art director reads **6000 chars** (was 2400); active-style re-click is a no-op | `ai/image.ts`, `Generator.tsx` |
| 8 | Operability | **Structured server-side logging** by `requestId` | `log.ts` + every route |
| 9 | Frontend/a11y | Modal **focus trap + restore**; `next/image` thumbnails; **in-UI delete confirm**; legible labels | `History.tsx`, others |
| 10 | Docs | Full API docs, `ARCHITECTURE.md`, `/architecture`, `VIDEO_SCRIPT.md`; CLAUDE.md reconciled | `README.md`, docs |

---

## 1 · Session secret fails closed 🔒

**Problem.** `session.ts` and `middleware.ts` fell back to a hardcoded
`"dev-insecure-secret-change-me"` with no production check. If `SESSION_SECRET`
were ever unset, cookies would be signed with a **public** secret → **forgeable**
→ anyone could read/delete another user's content.

**Fix.** A single `resolveSessionSecret()` returns `null` in production when no
real secret is set. Callers then **fail closed** instead of using a default.

```
                        request
                           │
                           ▼
                 resolveSessionSecret()
                     │            │
              secret set      no secret (prod)
                     │            │
        ┌────────────┘            └─────────────┐
        ▼                                        ▼
  middleware: mint signed cookie      middleware: SKIP minting
  session.ts: sign / verify (HMAC)    session.ts: secret() THROWS
        │                                        │
        ▼                                        ▼
  ownership scoping works              pages still render;
  where { id, sessionId }              API routes reject cleanly
                                       (no forgeable session ever issued)
```

Health now reports `sessionSecret: "set" | "missing"` so it's visible.
**Live check:** `sessionSecret: "set"` — the app is safe *and* unaffected.

## 2 · `/api/img` path validation 🔒

Only ever proxy our own generated images — never an arbitrary blob path:

```
GET /api/img?p=<path>
        │
        ▼
  /^images\/[a-f0-9-]{16,}\.png$/i  ──✗──▶ 404 (reject arbitrary paths)
        │ ✓
        ▼
  stream the private blob
```

## 3 · Body-size guard 🔒

`http.ts::tooLarge(req)` rejects oversized bodies by `Content-Length` **before**
parsing, on `generate` / `images` / `improve` → `PAYLOAD_TOO_LARGE` (413).

---

## 4 · Array counts enforced in code (not just the prompt)

**Problem.** "exactly 3 ad variants / 3 subject lines / 3–5 hashtags" lived only
in prompt text; schemas were unbounded and nothing checked the count.

**Fix.** Two layers:
- **Schema:** `strArrN(min, max)` adds `minItems`/`maxItems` (ad variants 3/3,
  subject lines 3/3, hashtags 3–5, blog sections ≥3) — enforced at decode.
- **Runtime:** `hasValidCounts(contentType, structured)` re-checks lengths and
  **retries** on mismatch in the structured `generate()` path.

**Live check:** an ad-copy generation returned **exactly 3 variants**.

## 5 · The streaming path is now guarded

**Problem.** The user-facing route streams markdown prose, which bypassed the
json-schema decode + degenerate-output retry (those only ran in the non-streamed
function). So the primary flow had **no** output guard.

**Fix.** `streamedOutputIssue(contentType, full)` runs **after** the stream, before
persisting.

```
Claude stream ──▶ full text accumulated
                        │
                        ▼
             streamedOutputIssue(type, full)
              │                      │
          issue found            looks good
              │                      │
              ▼                      ▼
   log + error trailer,      persist + save id,
   DO NOT persist,           normal trailer
   client shows "retry"
```

It rejects: too short, stub/placeholder, or a **per-type count miss on the live
markdown** for the counts we can detect reliably — ad < 3 variants ("Variant N"),
email < 3 subject lines ("Subject N"), blog < 3 sections ("## H2"). (LinkedIn
hashtags aren't reliably marked in the stream, so they're not guarded — counting
them would false-positive on valid posts.) So the count invariants are enforced
on the path users actually hit, not only in the structured helper. (Can't
re-stream mid-flight, so it's a fail-loud guard, not a retry.)

---

## 6 · Image scene caching (same subject on restyle)

**Problem.** Every restyle re-ran `describeScene`, so switching *style* could
silently drift the *subject* — and paid a fresh ~8s Claude call each time.

**Fix.** The derived scene is returned to the client, cached, and passed back on
restyle; the route reuses it and skips the art-director call.

```
FIRST image (new content)                RESTYLE (same content, new style)
─────────────────────────                ─────────────────────────────────
Generator: no cached scene               Generator: sends cached scene
        │                                        │
        ▼                                        ▼
POST /api/images {content}               POST /api/images {scene, style}
        │                                        │
        ▼                                        ▼
describeScene(copy) ──▶ scene            (skip describeScene — reuse scene)
        │                                        │
        ▼                                        ▼
render in style ──▶ image + scene        render SAME scene in new style
        │                                        │
        ▼                                        ▼
client caches scene ◀────────────────────  subject stays fixed, ~8s saved
```

**Live check:** restyle returned a new image with `sameScene: true`.
Also: `describeScene` now reads **6000** chars (was 2400) so long blogs are
illustrated by the whole piece; re-clicking the active style is a no-op (no
wasted paid call).

---

## 7 · Structured server-side logging

**Problem.** Every catch swallowed the error silently; the `requestId` returned to
clients was never logged, so 500s were undebuggable.

**Fix.** `log.ts` emits one JSON line per event (Vercel captures it), correlated by
`requestId`, wired into **every** route catch + the AI-error/guard paths.

```
route catch ──▶ logError(scope, requestId, err, meta)
                          │
                          ▼
      {"t":…,"level":"error","scope":"images.generate",
       "requestId":"req_…","msg":"…","reason":"rate_limit"}   ──▶ Vercel logs
                          │
                          ▼
        client still gets the declarative message + the same requestId
```

---

## 8 · Frontend & accessibility

- **Focus trap + restore:** the History detail modal traps Tab and returns focus
  to the element that opened it on close.
- **`next/image` thumbnails:** history cards render sized/optimized images instead
  of full-resolution 1–2.5 MB PNGs in 144 px slots.
- **In-UI delete confirm:** a two-step "Delete → Confirm delete" replaces the
  native `window.confirm`, matching the app's visual language.
- **Legibility:** sub-10 px labels bumped to ≥ 0.62 rem.

---

## Where the request pipeline stands now

```
Browser (no keys)
   │  fetch /api/*
   ▼
Edge middleware ── mint signed cookie  (skips if no secret → fail closed)
   │
   ▼
Route:  session ─▶ rate-limit ─▶ tooLarge? ─▶ zod validate ─▶ config check
   │                                                             │
   ▼                                                             ▼
  AI call (Claude / OpenAI)                              declarative errors
   │   success            failure                         (describeAiError)
   ▼                        │                                   │
 output guard              logError(requestId) ─────────────────┘
 (streamedOutputIssue /                         + typed envelope to client
  hasValidCounts)
   │ ok
   ▼
 persist (scoped where { id, sessionId }) ─▶ response
```

---

## Round 2 — minor fixes (after the re-grade)

A second independent re-grade (90/100) surfaced smaller gaps; these close them.

### R2.1 · Count enforcement moved onto the LIVE path (+ a caught regression)
The re-grade verified the bounded-schema + `hasValidCounts()` machinery lived in
`generate()`, which is **dead in the request path** — so counts were prompt-only
in production. `streamedOutputIssue()` now enforces per-type counts on the
streamed markdown (ad "Variant N", email "Subject N", blog "## H2").

> A live check then caught a **false positive**: LinkedIn hashtags aren't
> reliably `#`-prefixed in the stream, so the guard rejected a valid post. Fixed
> by dropping the LinkedIn count guard (kept the three reliable ones). All four
> types re-verified generating + saving.

### R2.2 · Self-critique steps in the prompts (calibration)
The ad / email / blog stream prompts now end with a short **self-check** naming
concrete targets — ad: three genuinely different angles (pain / aspiration /
social-proof); email: three distinct subject styles (curiosity / benefit /
personal); blog: ≥3 distinct sections — instead of relying on instructions alone.

### R2.3 · Image — "New variation" + richer alt text
- A **New variation** button re-rolls the *same style* (bypasses the active-style
  no-op via a `force` flag) so users can get a fresh take without switching style.
- Image **alt text** now uses the derived scene (`AI image — <scene>`) instead of
  just the topic, when available.

### R2.4 · Brand voice — "avoid" is now a hard-worded rule
`formatBrandVoice()` upgrades the avoid list from *"Avoid these words"* to
*"NEVER use these words/phrases (hard rule — rephrase to avoid them entirely)"* —
a firmer instruction (true post-generation enforcement remains future work).

### R2.5 · Client-supplied scene is sanitized
Before a restyle scene re-enters the image prompt it's stripped of control chars,
whitespace-collapsed, and capped at 600 chars.

### R2.6 · Legibility & clipboard polish
Remaining ~10 px labels bumped to ≥ 0.66 rem; History **Copy** buttons now show
`Copied ✓` and `.catch` clipboard failures.

### R2.7 · Docs
README health example includes `sessionSecret`; the video script is also rendered
to **`VIDEO_SCRIPT.pdf`** for recording.

---

## Round 3 — durability & workflow evidence

### R3.1 · Durable rate limiting
`rateLimit.ts` now uses **Upstash Redis** (sliding window) when
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set — correct across
Vercel's many serverless instances and cold starts — with a graceful **in-memory
fallback** when Redis isn't configured (so it still works locally). `checkRateLimit`
is now async; `/api/health` reports the active backend (`upstash` | `memory`).

### R3.2 · Committed Claude Code workflow artifacts
Added [`docs/claude-code/`](./docs/claude-code/): a `WORKFLOW.md` narrative, a
curated `prompt-log.md`, and the **actual multi-agent workflow scripts** used to
review and grade the build (`adversarial-review.js`, `grade-assessment.js`,
`regrade-assessment.js`) — concrete evidence of the AI-native workflow beyond
`CLAUDE.md` and the commit history.

## Round 4 — brand voice: server-side + hard enforcement

### R4.1 · Persist the brand voice server-side (source of truth)
The voice was localStorage-only (one browser, lost on clear). Now:
- a `BrandVoice` Prisma model (`brand_voices`, one row per session, JSON payload)
  + an **additive migration** applied on deploy;
- `GET`/`PUT /api/brand-voice` (session-scoped, degrades gracefully if the DB is off);
- Settings and the Generator **restore from the server** when localStorage is
  empty and re-cache it — so the voice survives a browser clear or a new tab.

```
Settings save ──▶ localStorage (cache) + PUT /api/brand-voice (DB, source of truth)
fresh browser ──▶ localStorage empty ──▶ GET /api/brand-voice ──▶ restore + re-cache
```

### R4.2 · Hard "avoid" enforcement (detect + one-click fix)
The avoid-list was a soft prompt instruction. Now the server **checks the output**
and the user can **guarantee** removal — without breaking the streaming UX:

```
generate stream done ──▶ findAvoidedWords(output, avoid)
                              │ any hits?
                              ▼
        trailer carries `avoided: [...]`  ──▶  UI banner:
        "Uses N avoided words: X, Y   [Rewrite to remove]"
                              │ click
                              ▼
        POST /api/enforce-voice ──▶ Claude rewrites them out,
        updates the stored row, returns { text, remaining }
```

`enforceVoice()` rewrites the copy to remove the banned words (and close
variants), preserving meaning/tone/formatting; the response reports any word that
still `remaining`s, so the guarantee is surfaced honestly rather than assumed.

---

## Verification

Everything above was confirmed on **https://magna-test-ten.vercel.app** after
deploy:

- all four content types generate + save (blog / LinkedIn / ad / email) — the
  per-type guard accepts real output and no longer false-rejects LinkedIn

- `sessionSecret: "set"` · db connected · all keys set
- session cookie mints; **forged cookies rejected** (HMAC verify); sessions are
  isolated (session B cannot read session A's entry → 404)
- generate: 200, saved, **exactly 3 ad variants**
- image: enhanced, restyle keeps the **same subject** (`sameScene: true`)
- improve + history: healthy, session-scoped

**Still outstanding (not a code fix):** record the video walkthrough — it's the
last required deliverable and the primary evidence for the Claude Code Usage
dimension. See [`VIDEO_SCRIPT.md`](./VIDEO_SCRIPT.md).
