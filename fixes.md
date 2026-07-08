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

## Round 5 — multiple brand voices + trade-off cleanup

### R5.1 · Many brand voices (add / edit / delete / pick)
The brand voice went from **one per session** to **many**:
- `BrandVoice` model changed to `id`-PK + `sessionId` index (migration
  recreates the table); `GET`/`POST /api/brand-voice` (list / create, capped at
  10) and `PUT`/`DELETE /api/brand-voice/[id]` (update / delete, ownership-scoped).
- **Settings** is now a manager: a list of voice cards with **Edit** and **Delete**
  (two-step confirm) and an **Add brand voice** form.
- **Generator** has a **voice picker** (`None` + each saved voice); the choice is
  remembered per browser and applied to that generation (the image follows from
  the copy). Fully server-backed.

### R5.2 · Trade-offs pruned
`ARCHITECTURE.md` and the `/architecture` page dropped the trade-offs that are now
fixed — the in-memory rate limiter (→ durable Upstash) and the soft brand-voice
instruction (→ server-side, multiple, hard-enforced) — and "what's next" no longer
lists hard enforcement.

## Round 6 — user authentication (email + password)

Real accounts layered over the anonymous sessions (full flow in
[`auth/session.md`](./auth/session.md)):

- `User` model + migration; `POST /api/auth/{signup,login,logout}` and
  `GET /api/auth/me`; scrypt password hashing; a 7-day HMAC-signed `acms_auth`
  token; `getSessionId()` resolves to the account id when logged in, else the
  anonymous session. Anonymous work is **migrated to the account** on signup (and
  login), so it follows the user across devices. `/account` page + TopNav auth state.

Fixes from the adversarial security review folded in:
- `verifyPassword` pins the scrypt length (a malformed hash can't authenticate);
- login & signup **rate-limited by client IP** before the scrypt work;
- concurrent duplicate signup (P2002) returns "email exists," not a 500;
- **logout clears the anonymous cookie too** (shared-browser safety);
- documented trade-offs (signup email-existence signal; login claiming a shared
  device's anonymous work).

## Round 7 — signup validation & cookie consent

- **Disposable/temp email blocking** — signup rejects known throwaway providers
  (server-side via the 121k-domain `disposable-email-domains` list, kept out of the
  client bundle) with a clear message.
- **Email format validation** on both client (inline) and server (zod `.email()`).
- **Password strength meter** — a shared `passwordStrength()` (weak / medium /
  strong) drives a live 3-bar meter on signup; submit is gated to ≥ medium.
- **Cookie-consent banner** — a dismissible Accept / Decline bar (choice stored in
  localStorage), noting the app uses only essential session cookies.

---

## Round 8 — admin dashboard, activity tracking & the stale-header fix

### R8.1 · Header showed "Sign in" after signing in 🐛

The nav kept showing **Sign in** even after a successful login. Root cause: the
browser **cached** `GET /api/auth/me`, so the post-login re-check served the stale
pre-login `{ user: null }`. Fixed three ways: `cache: "no-store"` on the fetch, a
`cache-control: no-store` header on the `/me` response, and an `auth-changed`
event dispatched on login/signup/logout so the header re-checks **instantly**.

### R8.2 · Full activity tracking

A new append-only `ActivityEvent` model + migration. A best-effort `track()` writes
one row per meaningful action, tagged user-vs-anonymous via a new `getActor()`:

```
generate ─┐
images   ─┤
improve  ─┼─▶ track(type, actor, isUser, meta)  ──▶  activity_events  (best-effort,
enforce  ─┤        never blocks the response             never throws)
signup   ─┤
login    ─┘
visit  ──▶ /api/track/visit ──▶ one session_start per new anonymous browser
                                 (deduped by a dedicated cookie, because Edge
                                  middleware pre-mints the session id)
```

### R8.3 · Admin dashboard (`/admin`)

A single env-configured operator (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) — no admin
table, nothing to seed or leak. Constant-time credential check, IP-rate-limited
login, an HMAC-signed admin cookie, and a server-guarded page.

```
/admin/login ─▶ POST /api/admin/login ─(constant-time check, rate-limited)─▶ acms_admin cookie
   /admin (server guard: isAdmin() else redirect) ─▶ AdminDashboard
        ├─ GET /api/admin/stats  → users · anon sessions · totals-by-type · 14-day chart · user/anon split
        ├─ GET /api/admin/users  → per-user content + action counts
        └─ DELETE /api/admin/users/[id] → cascades generations + brand voices + activity, in one txn
```

Verified **27/27** end-to-end against a throwaway local Postgres (every aggregate,
the delete cascade, the visit-dedup, and all guards) plus a live smoke test.

---

## Round 9 — modern disposable-email hardening 🔒

The base `disposable-email-domains` list (121k domains) lagged behind the temp-mail
services in use **today** — 19 popular ones slipped through (`mail.tm`, `mail.gw`,
`tempmail.com`, `temp-mail.io`, `emailondeck.com`, `minuteinbox.com`,
`disposablemail.com`, the `tempmail.plus` alias domains, `1secmail`'s random
receiving domains…). `isDisposableEmail` is now hardened three ways:

```
email domain
   │
   ├─▶ exact match in base list OR curated supplement (88 current providers/aliases)  ─▶ block
   ├─▶ parent-domain match (so inbox.tempmail.plus is caught)                          ─▶ block
   └─▶ brand-token heuristic (tempmail / mailinator / guerrillamail / …)               ─▶ block
                                                                       else ─▶ allow
```

Verified: all 19 previously-open domains blocked, subdomain + heuristic coverage
holds, and **0 false positives** across 20 legit domains — including the deliberate
traps `mailtemplate.com`, `tempranillo-wines.com`, `temple.edu`, and `mailchimp.com`
(a risky `"mailtemp"` token was removed to keep `mailtemplate.com` valid). Live:
10/10 modern temp domains rejected, a real `@gmail.com` still signs up.

---

## Round 10 — mobile responsiveness & the interactive Workflow page

### R10.1 · Landing demo no longer scroll-jacks the page 🐛

On mobile the self-running demo had **no fixed height**, so as it cycled through
acts its height swung **339px → 800px** — shoving everything below it and making
the page appear to auto-scroll up and down. Fixed by giving the demo a **fixed
height with internal scroll** on mobile (`h-[70vh] max-h-[600px]`), so the outer
box stays a constant ~607px and the page never shifts. Confirmed stable across all
three acts.

### R10.2 · Navigation no longer overflows on mobile 🐛

With 7 links, the mobile nav overflowed horizontally and pushed **"Sign in"
off-screen** — unreachable without scrolling the nav. Rebuilt as a proper
responsive header: brand + an always-visible auth button + a **hamburger menu**
that drops down the full link list. Nothing runs past the screen edge; sign-in is
always one tap away.

### R10.3 · A new interactive Workflow page (`/workflow`)

Two click-through flowcharts built for the walkthrough video:

- **"For everyone"** — the 6-step user journey, plain-language, no jargon.
- **"Under the hood"** — the full 9-step `/api/generate` pipeline, with a red
  **"on error"** branch on each step showing exactly how that failure is caught and
  turned into the one typed error envelope.

Each box is revealed on click (with a pulsing "click to start" nudge on the first),
distinct colors per node type (you / server / AI / storage), and animated
connectors. Fully responsive.

---

## 11 · Abuse hardening — double-click & concurrency guards

**Problem.** Every button that calls the AI is a real, billable model call. Two
ways to waste them (or grief the service): (a) an impatient user double-tapping
"Generate," and (b) a script firing many **simultaneous** requests from one
session — the "hammer the endpoint" case. The sliding-window rate limit caps
requests *over a window*, but says nothing about requests fired *at the same
instant*, and a React `disabled` attribute has a race: state updates are async, so
two clicks in the same tick can both see `disabled === false`.

**Fix — two layers.**

- **Client (`useInFlight`).** A tiny hook wraps each submit handler with a
  **synchronous `useRef` guard** — it flips before React re-renders, so the gap
  between the click and the disabled button is closed. Rapid double-taps and
  scripted `.click()` loops are dropped. Wired into every AI/backend button:
  Generate, image (re)generation, improve, enforce-voice, brand-voice save,
  login/signup, and admin delete.
- **Server (`concurrency.ts`).** A **per-session in-flight lock** — at most one
  AI request per session at a time. `acquireAiSlot()` does a Redis `SET key "1"
  NX PX=90s` (durable across serverless instances; in-memory `Map` fallback when
  Upstash isn't configured); the route releases it in a `finally` (for the
  streaming `/api/generate`, inside the stream's `finally` so it frees on success,
  refusal, AI error, or unusable output alike). A second concurrent request is
  refused with **`429 CONCURRENT_REQUEST`** rather than fanned out into another
  paid call. The 90-second TTL auto-releases a slot if a request dies mid-flight.

```
        two rapid clicks / N concurrent POSTs from one session
                    │                         │
      client: useInFlight ref          server: acquireAiSlot()  (SET NX PX)
        first passes, rest             first gets the slot, rest get null
        return immediately                        │
                    │                             ▼
                    └────────►  one AI call    429 CONCURRENT_REQUEST
                                     │           (no extra billable call)
                                     ▼
                              releaseAiSlot() in finally  (always frees)
```

Applied to all four AI endpoints: `/api/generate`, `/api/improve`,
`/api/images` (the lock spans the art-director call *and* the render), and
`/api/enforce-voice`. Auth endpoints stay IP-rate-limited (a per-session lock
wouldn't help an attacker who drops the cookie). Surfaced on the landing bonuses,
the capability strip, and both `/workflow` flowcharts.

**Files.** `concurrency.ts`, `useInFlight.ts`, `http.ts` (new
`CONCURRENT_REQUEST` code → 429), the `generate` / `improve` / `images` /
`enforce-voice` routes, `Generator.tsx`, `Improver.tsx`, `History.tsx`,
`BrandVoiceForm.tsx`, `account/page.tsx`, `AdminDashboard.tsx`,
`Architecture.tsx`, `DemoCapabilities.tsx`, `WorkflowFlows.tsx`.

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
