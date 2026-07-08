export const meta = {
  name: 'grade-assessment',
  description: 'Grade the AI Content Marketing Suite against the Magna Labs rubric — critical examiner panel + synthesis',
  phases: [{ title: 'Grade' }, { title: 'Synthesize' }],
}

const LIVE = 'https://magna-test-ten.vercel.app'

const EVIDENCE = [
  'A live end-to-end test run against the deployed site passed 22/22 checks. Key evidence:',
  '- Content generation 6/6: 3 topics x {no brand voice, brand voice}. Blog=6823 chars, LinkedIn=1049, email=1155; all saved to DB. Distinct per-type prompt strategies in code: blog = SEO long-form (title, meta description, H2 sections, conclusion, single CTA); LinkedIn = scroll-stopping hook + short lines + soft CTA + 3-5 hashtags; ad = EXACTLY 3 variants each a different psychological angle; email = 3 subject lines + preview text + body + single CTA.',
  '- Images 6/6: real PNGs 1.2-2.5MB each, six different styles; 5/6 had enhanced=true (the content-aware art-director step ran). Example content-aware prompt literally reflected the copy (a founder relaxing while invoices clear themselves).',
  '- Improve 4/4: shorter / more_persuasive / more_formal / seo_optimized, each returned improved text + a changeSummary.',
  '- History: 10 items, session-scoped, paginated, 6 with attached images.',
  '- Exports (bonus): txt, pdf, pdf+photo (image embedded), docx, docx+photo (real OOXML media part) — all produced valid files.',
  '- Brand voice (bonus): measurable effect — brand keywords used plain->voice were 2->3, 0->3, 0->2 across the three topics; one avoid-word slipped through in one of three (soft instruction, not a hard filter).',
  '- Security: all AI server-side, no NEXT_PUBLIC secrets, HMAC-signed session cookie (Edge middleware), ownership scoping where { id, sessionId }, identical 404 for missing and foreign ids (no enumeration), zod validation at every boundary, per-session rate limiting, one typed error envelope, and (new) a declarative AI-error classifier.',
  '- Frontend: landing page with a self-running 3-act demo, an "Under the hood" architecture section, responsive at 375px and 1280px (verified no horizontal overflow), live token streaming UI, tasteful animations with prefers-reduced-motion handling, WCAG contrast fixes.',
  '- Docs: README with full per-endpoint API docs; ARCHITECTURE.md one-pager; in-app /architecture page.',
].join('\n')

const RUBRIC = {
  llm: {
    dim: 'LLM & Prompt Quality',
    max: 25,
    criteria: 'Output quality, a distinct prompt strategy per content type, relevance and coherence. At least 3 content types required.',
    files: 'src/lib/ai/generate.ts (TYPES map, per-type system/streamSystem/schema/assemble), src/lib/ai/improve.ts, src/app/api/generate/route.ts',
  },
  image: {
    dim: 'AI Image Generation',
    max: 20,
    criteria: 'Auto prompt quality, image relevance to the content, smooth UX flow, regenerate with a different style, content-visual pairing.',
    files: 'src/lib/ai/image.ts (buildImagePrompt, describeScene, buildImagePromptFromContent, model fallback), src/app/api/images/route.ts, src/lib/blob.ts, src/components/Generator.tsx (image panel + style picker)',
  },
  backend: {
    dim: 'Backend & API Design',
    max: 20,
    criteria: 'Structure, error handling, security, README documentation. All AI logic server-side, no client-side LLM/image calls.',
    files: 'src/app/api/* (all routes), src/lib/http.ts, src/lib/ai/errors.ts, src/lib/validation.ts, src/lib/session.ts, src/lib/rateLimit.ts, src/middleware.ts, prisma/schema.prisma, README.md',
  },
  frontend: {
    dim: 'Frontend & UI/UX',
    max: 15,
    criteria: 'Usability, design quality, responsiveness, text-and-image layout.',
    files: 'src/app/page.tsx, src/components/Generator.tsx, Improver.tsx, History.tsx, AutoDemo.tsx, Architecture.tsx, TopNav.tsx, src/app/globals.css',
  },
  claudecode: {
    dim: 'Claude Code Usage',
    max: 15,
    criteria: 'Demonstrated AI-native workflow shown clearly in the VIDEO (architecture planning, debugging, refactoring, prompt-driven code gen). NOTE: the video is NOT available to you — assess only the repo-side evidence (CLAUDE.md, commit history quality/cadence, build-order doc, the sophistication that implies an AI-native workflow) and state clearly that the real 15 pts hinge on the video you cannot see. Give a conservative estimate + the range.',
    files: 'CLAUDE.md, README.md; run: git log --oneline -30',
  },
  bonus: {
    dim: 'Bonus',
    max: 10,
    criteria: 'Brand voice settings, image style picker, export to PDF or doc. Each present and working earns bonus (10 max).',
    files: 'src/components/BrandVoiceForm.tsx, src/lib/brandVoice.ts, src/lib/validation.ts (formatBrandVoice), src/lib/export.ts, src/components/Generator.tsx (style picker), src/components/History.tsx (download menu)',
  },
}

const KEYS = Object.keys(RUBRIC)

phase('Grade')
const grades = (
  await parallel(
    KEYS.map((k) => () => {
      const r = RUBRIC[k]
      const prompt =
        'You are a HIGHLY CRITICAL, senior technical examiner grading a 48-hour AI-engineering assessment submission (an "AI Content Marketing Suite"). Grade ONLY this one rubric dimension. Calibrate to a demanding hiring bar: full marks are rare and must be earned; deduct concretely for real gaps. Do NOT inflate — the author is not in the room.\n\n' +
        'DIMENSION: ' + r.dim + '  (max ' + r.max + ' pts)\n' +
        'RUBRIC CRITERIA: ' + r.criteria + '\n\n' +
        'READ these files in the repo before scoring: ' + r.files + '\n' +
        'You may curl ' + LIVE + '/api/health and the static pages to confirm the app is live (cheap). Do NOT run paid generation calls — the live behaviour is already captured below.\n\n' +
        'LIVE TEST EVIDENCE (already gathered):\n' + EVIDENCE + '\n\n' +
        'Score the dimension out of ' + r.max + '. List concrete strengths and concrete deductions (each with a point cost and a one-line reason). Be specific and cite files/behaviour. Give a one-paragraph verdict. Return the numeric score you would actually award.'
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
  .map((g) => `${g.dimension}: ${g.score}/${g.max} (confidence ${g.confidence})\n  strengths: ${(g.strengths || []).join('; ')}\n  deductions: ${(g.deductions || []).map((d) => d.issue + ' (-' + d.points + ')').join('; ')}\n  verdict: ${g.verdict}`)
  .join('\n\n')

const final = await agent(
  'You are the HEAD EXAMINER for the Magna Labs 48-hour assessment. Six dimension graders have scored a submission. Produce the final scorecard. Be honest and calibrated to a senior hiring bar — cross-check for any grader that was too generous or too harsh and note it. The core dimensions sum to 90 (LLM 25 + Image 20 + Backend 20 + Frontend 15 + ClaudeCode 15) and Bonus adds up to +10, for a total ceiling of 100.\n\n' +
    'IMPORTANT context to fold into the verdict: (1) Claude Code Usage (15) and the required Video Walkthrough depend on a video that was NOT available to the graders — flag this and give the score as an estimate with a range. (2) Submission completeness: Live URL is up and public; GitHub repo + README + API docs + ARCHITECTURE note exist; the VIDEO still needs to be recorded by the candidate. (3) The grade is an estimate.\n\n' +
    'GRADER RESULTS:\n' + synthInput + '\n\n' +
    'Return the final total (sum of the six awarded scores, capped at 100), a per-dimension breakdown, the top strengths, the top gaps/risks, a submission-completeness status line, an overall verdict on whether this clears a strong-hire bar, and an estimated grade band.',
  {
    label: 'synthesize',
    phase: 'Synthesize',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['perDimension', 'coreTotal', 'bonus', 'grandTotal', 'topStrengths', 'topGaps', 'submissionStatus', 'overallVerdict', 'gradeBand', 'caveats'],
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
        topStrengths: { type: 'array', items: { type: 'string' } },
        topGaps: { type: 'array', items: { type: 'string' } },
        submissionStatus: { type: 'string' },
        overallVerdict: { type: 'string' },
        gradeBand: { type: 'string' },
        caveats: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)

return { grades, final }
