export const meta = {
  name: 'regrade-assessment',
  description: 'RE-GRADE the AI Content Marketing Suite after remediation — critical examiner panel + synthesis',
  phases: [{ title: 'Grade' }, { title: 'Synthesize' }],
}

const LIVE = 'https://magna-test-ten.vercel.app'

const EVIDENCE = [
  'This is a RE-GRADE after a remediation pass. Score the CURRENT code. A live re-verification just now confirmed: health env sessionSecret:"set", db connected; a session cookie mints; POST /api/generate (ad_copy) returned HTTP 200 with EXACTLY 3 ad variants and saved; image#1 enhanced:true with a derived scene; image#2 restyle passing the cached scene returned a new image with sameScene:true (subject preserved, art-director call skipped); improve OK; history scoped to the session.',
  '',
  'REMEDIATION APPLIED SINCE THE LAST GRADE (all in the current code, live-verified):',
  '1. Security: SESSION_SECRET now FAILS CLOSED in production via src/lib/sessionSecret.ts (never signs/verifies with a public default) — wired into session.ts (throws) and middleware.ts (skips minting, pages still render); health now reports sessionSecret. /api/img validates the path is images/<uuid>.png only (no arbitrary blob proxying). Body-size guard http.ts::tooLarge on generate/images/improve.',
  '2. LLM: array-count invariants are now enforced IN CODE — schema minItems/maxItems (ad variants 3/3, subject lines 3/3, hashtags 3-5, blog sections >=3) plus a runtime hasValidCounts() assertion in generate.ts that retries on mismatch. The streaming path (the user-facing route) is now guarded by streamedOutputIssue(): it refuses to persist too-short/stub/<3-variant output and tells the client to retry.',
  '3. Image: buildImagePromptFromContent now caches the derived scene and reuses it on restyle (imageSchema.scene), so switching style keeps the SAME subject and skips a fresh ~8s Claude call; the active-style re-click is a no-op in Generator.tsx; describeScene now reads up to 6000 chars (was 2400).',
  '4. Operability: structured server-side logging src/lib/log.ts (JSON lines, correlated by requestId) wired into EVERY route catch block (generate, images, improve, history, history/[id]).',
  '5. Frontend/a11y: History detail modal now has a real focus trap + focus restoration to the trigger; thumbnails render via next/image (sized/optimized, no more full-res PNGs in 144px slots); delete uses an in-UI two-step confirm (no native window.confirm); sub-legible labels bumped to >=0.62rem.',
  '6. Docs: README has full per-endpoint API docs; ARCHITECTURE.md; in-app /architecture page; VIDEO_SCRIPT.md (a scene-by-scene shooting script). CLAUDE.md reconciled with the image model fallback chain.',
  '',
  'STILL OUTSTANDING: the required VIDEO WALKTHROUGH is not yet recorded — so Claude Code Usage (15) remains a repo-only estimate, and the video is a standalone required deliverable.',
].join('\n')

const RUBRIC = {
  llm: {
    dim: 'LLM & Prompt Quality',
    max: 25,
    criteria: 'Output quality, a distinct prompt strategy per content type, relevance and coherence. At least 3 content types.',
    files: 'src/lib/ai/generate.ts (TYPES map, strArrN bounded schemas, hasValidCounts, streamedOutputIssue), src/lib/ai/improve.ts, src/app/api/generate/route.ts (streaming guard + logging)',
  },
  image: {
    dim: 'AI Image Generation',
    max: 20,
    criteria: 'Auto prompt quality, image relevance to the content, smooth UX flow, regenerate with a different style, content-visual pairing.',
    files: 'src/lib/ai/image.ts (describeScene 6000-char, buildImagePromptFromContent scene caching), src/app/api/images/route.ts (scene passthrough + logging), src/lib/validation.ts (imageSchema.scene), src/components/Generator.tsx (scene cache + active-style guard)',
  },
  backend: {
    dim: 'Backend & API Design',
    max: 20,
    criteria: 'Structure, error handling, security, README documentation. All AI logic server-side.',
    files: 'src/lib/sessionSecret.ts, src/lib/session.ts, src/middleware.ts, src/lib/log.ts, src/lib/http.ts (tooLarge), src/lib/ai/errors.ts, src/app/api/img/route.ts (path validation), src/app/api/*/route.ts (logging + body guards), README.md',
  },
  frontend: {
    dim: 'Frontend & UI/UX',
    max: 15,
    criteria: 'Usability, design quality, responsiveness, text-and-image layout.',
    files: 'src/components/History.tsx (focus trap + restore, next/image thumbnails, two-step delete confirm), src/components/Generator.tsx, AutoDemo.tsx, Architecture.tsx, TopNav.tsx (label sizes), src/app/globals.css',
  },
  claudecode: {
    dim: 'Claude Code Usage',
    max: 15,
    criteria: 'Demonstrated AI-native workflow shown in the VIDEO. The video is NOT available to you — assess repo-side evidence only (CLAUDE.md, commit history incl. the new remediation commits, VIDEO_SCRIPT.md, .claude/ artifacts) and give a conservative estimate + range, stating the score hinges on the unseen video.',
    files: 'CLAUDE.md, VIDEO_SCRIPT.md, README.md; run: git log --oneline -40',
  },
  bonus: {
    dim: 'Bonus',
    max: 10,
    criteria: 'Brand voice settings, image style picker, export to PDF or doc. Present and working earns up to 10.',
    files: 'src/components/BrandVoiceForm.tsx, src/lib/brandVoice.ts, src/lib/validation.ts, src/lib/export.ts, src/components/Generator.tsx, src/components/History.tsx',
  },
}

const KEYS = Object.keys(RUBRIC)

phase('Grade')
const grades = (
  await parallel(
    KEYS.map((k) => () => {
      const r = RUBRIC[k]
      const prompt =
        'You are a HIGHLY CRITICAL, senior technical examiner RE-GRADING a 48-hour AI-engineering assessment ("AI Content Marketing Suite") after the author applied a remediation pass. Grade ONLY this one dimension against the CURRENT code. Calibrate to a demanding hiring bar: full marks are rare and must be earned; deduct concretely for remaining real gaps; do NOT inflate just because fixes were made — verify them in the code.\n\n' +
        'DIMENSION: ' + r.dim + '  (max ' + r.max + ' pts)\n' +
        'RUBRIC CRITERIA: ' + r.criteria + '\n\n' +
        'READ these files before scoring: ' + r.files + '\n' +
        'You may curl ' + LIVE + '/api/health and static pages (cheap). Do NOT run paid generation calls — live behaviour is captured below.\n\n' +
        'CONTEXT & EVIDENCE:\n' + EVIDENCE + '\n\n' +
        'Score out of ' + r.max + '. List concrete strengths and any remaining concrete deductions (each with a point cost + reason, citing files). One-paragraph verdict. Return the numeric score you would award now.'
      return agent(prompt, {
        label: 'grade:' + k,
        phase: 'Grade',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['dimension', 'max', 'score', 'strengths', 'deductions', 'verdict', 'confidence'],
          properties: {
            dimension: { type: 'string' },
            max: { type: 'number' },
            score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            deductions: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['issue', 'points'],
                properties: { issue: { type: 'string' }, points: { type: 'number' } },
              },
            },
            verdict: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
        },
      })
    }),
  )
).filter(Boolean)

phase('Synthesize')
const synthInput = grades
  .map((g) => `${g.dimension}: ${g.score}/${g.max} (confidence ${g.confidence})\n  strengths: ${(g.strengths || []).slice(0, 6).join('; ')}\n  remaining deductions: ${(g.deductions || []).map((d) => d.issue + ' (-' + d.points + ')').join('; ') || 'none'}\n  verdict: ${g.verdict}`)
  .join('\n\n')

const final = await agent(
  'You are the HEAD EXAMINER re-scoring a Magna Labs 48-hour assessment after a remediation pass. Six dimension graders scored the CURRENT code. Produce the final scorecard, honest and calibrated to a senior hiring bar; cross-check for any grader that was too generous/harsh. Dimension maxes: LLM 25, Image 20, Backend 20, Frontend 15, ClaudeCode 15 (sum 95) + Bonus 10, total ceiling 100.\n\n' +
    'Fold in: (1) Claude Code Usage (15) and the required video depend on a video NOT available to graders — flag it and give a range. (2) Submission completeness: live URL up + public; repo/README/API-docs/ARCHITECTURE/VIDEO_SCRIPT present; the VIDEO itself still needs recording. (3) Compare to the prior grade of 89/100 and state the delta the remediation earned.\n\n' +
    'GRADER RESULTS:\n' + synthInput + '\n\n' +
    'Return: per-dimension breakdown, coreTotal, bonus, grandTotal (capped 100), the delta vs the prior 89, top remaining gaps, submission-completeness status, overall verdict, estimated grade band, and caveats.',
  {
    label: 'synthesize',
    phase: 'Synthesize',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['perDimension', 'coreTotal', 'bonus', 'grandTotal', 'deltaVsPrior', 'topRemainingGaps', 'submissionStatus', 'overallVerdict', 'gradeBand', 'caveats'],
      properties: {
        perDimension: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['dimension', 'score', 'max'],
            properties: { dimension: { type: 'string' }, score: { type: 'number' }, max: { type: 'number' } },
          },
        },
        coreTotal: { type: 'number' },
        bonus: { type: 'number' },
        grandTotal: { type: 'number' },
        deltaVsPrior: { type: 'string' },
        topRemainingGaps: { type: 'array', items: { type: 'string' } },
        submissionStatus: { type: 'string' },
        overallVerdict: { type: 'string' },
        gradeBand: { type: 'string' },
        caveats: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)

return { grades, final }
