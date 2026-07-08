# Claude Code workflow

How this project was built with **Claude Code** as the primary development tool —
the artifacts here are committed evidence of an AI-native process, not a summary
written after the fact.

## 1 · Steering doc first (`CLAUDE.md`)

The build started from a project-root [`CLAUDE.md`](../../CLAUDE.md) that encodes
the non-negotiables (all AI server-side, no `NEXT_PUBLIC` secrets), the exact
model configuration (`claude-sonnet-5`, structured `output_config`, `thinking:
disabled`, no temperature, assert array counts), the conventions, the file
structure, and an explicit **build order**. Claude Code read this on every turn
and the plan was executed in that order.

## 2 · Plan → execute in phases

The build order maps almost 1:1 onto the commit history:

```
git init → scaffold → Neon + init migration → lib foundations →
/api/health + deploy → content generator → image pipeline →
improver + history → bonus + docs
```

`git log --oneline` shows the phased, conventional commits (`feat`/`fix`/`chore`/
`docs`), each Claude-co-authored.

## 3 · A real debugging arc (the image → Blob saga)

The most instructive sequence — Claude Code diagnosing a live 502 and iterating:

| Commit | What Claude Code did |
|--------|----------------------|
| `feefa5f` | surfaced the underlying upstream error to see what was failing |
| `aee098a` | dropped an image param the current OpenAI API rejected |
| `e18cc50` | added a model **fallback chain** (`gpt-image-1 → dall-e-3 → dall-e-2`) |
| `bcc66d7` | surfaced the raw Blob error for diagnosis |
| `9ea492e` | root cause: a **private** Blob store — added an `/api/img` proxy to stream it |

This is the debug/iterate loop the rubric rewards, visible in the repo.

## 4 · Refactoring passes

Prompt-driven refactors Claude Code performed, e.g.:
- A single **declarative AI-error classifier** ([`src/lib/ai/errors.ts`](../../src/lib/ai/errors.ts))
  wired across every route, replacing generic "please try again" strings.
- **Fail-closed** session security ([`src/lib/sessionSecret.ts`](../../src/lib/sessionSecret.ts)).
- **Durable rate limiting** with an in-memory fallback ([`src/lib/rateLimit.ts`](../../src/lib/rateLimit.ts)).

## 5 · AI-native QA & grading (multi-agent workflows)

Beyond writing code, Claude Code **orchestrated fleets of subagents** to review
and grade the work. The actual scripts are committed here:

- [`workflows/adversarial-review.js`](./workflows/adversarial-review.js) — a
  pipeline that spawns per-dimension reviewers, then **adversarially verifies**
  each finding with an independent skeptic before it counts. Used before pushing
  every substantial change; confirmed findings were fixed in the same commit.
- [`workflows/grade-assessment.js`](./workflows/grade-assessment.js) — a panel of
  six critical examiners (one per rubric dimension) + a head-examiner synthesis,
  reading the code and live-test evidence to produce a scorecard.
- [`workflows/regrade-assessment.js`](./workflows/regrade-assessment.js) — the
  same panel re-run after a remediation pass to measure the delta.

Each is a small deterministic script that fans out `agent()` calls, forces
structured output via a JSON schema, and synthesizes the results — the pattern
that drove the review-and-remediate cycles documented in
[`../../fixes.md`](../../fixes.md).

## 6 · Verify-in-production loop

Every change was verified against the live deployment before being trusted —
build → live end-to-end test (real generate/image/improve/history calls) →
confirm → push. This caught real regressions (e.g. a LinkedIn count-guard
false-positive) before they shipped, documented in `fixes.md`.

---

See [`prompt-log.md`](./prompt-log.md) for a curated log of the representative
prompts behind these phases.
