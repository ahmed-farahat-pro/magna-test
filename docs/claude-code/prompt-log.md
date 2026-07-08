# Prompt log (curated)

Representative prompts that drove the build with Claude Code, grouped by phase.
Abridged for readability; the outcomes are traceable to the commits and files
named alongside each.

## Planning
- *"Plan the whole build in detail with flow diagrams — what we'll do and in what
  order."* → produced the phased build order now in `CLAUDE.md` and executed as
  the commit sequence.

## Content generator (phase: LLM)
- *"Build the generator: four content types, a distinct prompt strategy per type,
  structured output, assert the array counts."* → `src/lib/ai/generate.ts` (the
  `TYPES` map with per-type `system`/`streamSystem`/`schema`/`assemble`,
  `strArrN` bounded schemas, `hasValidCounts`, `isDegenerate`).
- *"Stream the AI text token-by-token so it looks live."* → the streaming route
  with a record-separator (`U+001E`) trailer + the live-typing UI.

## Image pipeline (phase: Image) — with the debugging arc
- *"We have a 502 creating images — fix it."* → surfaced the raw error, dropped an
  unsupported param, then added the model **fallback chain**.
- *"…still failing: Vercel Blob private store."* → root-caused to a private store
  and added the `/api/img` proxy (commit `9ea492e`).
- *"Make the image prompt content-aware so photos reflect the text."* → the
  art-director `describeScene` step in `src/lib/ai/image.ts`, with a deterministic
  fallback and an 8s timeout.

## Improver, history, bonus
- *"Add the improver (5 goals) + history dashboard + brand voice, image style
  picker, and export to PDF/Word."* → `improve.ts`, `History.tsx`, `BrandVoiceForm`,
  `export.ts` (real `.docx` via the docx lib + jsPDF).

## Landing page & demo
- *"Add a landing page with a fully automated, self-running demo — typing,
  streaming, image painting in — plus flow diagrams."* → `AutoDemo.tsx` (3-act
  tour) and the `Architecture.tsx` "Under the hood" call-flow section.

## Error handling & security (refactor)
- *"Make AI errors declarative — say what went wrong and whether to retry."* →
  `src/lib/ai/errors.ts` classifier, unit-tested across 10 error shapes.
- *"The session secret must fail closed in production."* → `sessionSecret.ts`,
  wired through `session.ts` + `middleware.ts`.

## AI-native review & grading (multi-agent)
- *"Run an adversarial review of this change before I push."* → the
  [`adversarial-review.js`](./workflows/adversarial-review.js) workflow: dimension
  reviewers → independent verifiers → only confirmed findings, fixed in-commit.
- *"Grade this against the rubric with a panel of critical examiners and give a
  score."* → [`grade-assessment.js`](./workflows/grade-assessment.js) and, after
  fixes, [`regrade-assessment.js`](./workflows/regrade-assessment.js).
- *"Do the grading again after the fixes."* → the re-grade that measured the
  delta and surfaced the count-enforcement dead-code gap, then fixed on the live
  path (see `fixes.md`).

## Verification discipline (every change)
- *"Verify it on the live site, then push."* → the build → live-E2E → confirm →
  push loop that caught e.g. the LinkedIn count-guard false-positive before it
  shipped.
