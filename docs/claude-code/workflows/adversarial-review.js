export const meta = {
  name: 'review-image-prompt-enhancement',
  description: 'Adversarially review the content-aware image-prompt (art-director) change before push',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const LENSES = [
  {
    key: 'anthropic-api',
    prompt: `Review src/lib/ai/image.ts — a new content-aware image-prompt step. It adds describeScene() which calls Claude via anthropic().messages.create with output_config json_schema (SCENE_SCHEMA), thinking disabled, model MODEL (claude-sonnet-5), and parses res.content text block as JSON. Compare it to the EXISTING working pattern in src/lib/ai/generate.ts (generate()). Also read src/lib/ai/config.ts.
The project's CLAUDE.md mandates: structured output via output_config.format json_schema, NO temperature (rejected on Sonnet 5), thinking disabled for short calls, no assistant prefill.
Hunt for REAL defects:
- Does the messages.create call exactly match the SDK shape used in generate.ts (known-good)? Any missing/extra param that would 400 (e.g. temperature, top_p, wrong output_config nesting)?
- Is the response parsed correctly? generate.ts does res.content.find(b=>b.type==='text') then JSON.parse(block.text). Does describeScene do the same, and handle refusal/empty/parse-failure by returning null?
- SCENE_SCHEMA has additionalProperties false, required scene. Valid JSON schema for structured output?
- If output_config json_schema is NOT supported at runtime and throws, does buildImagePromptFromContent's try/catch guarantee image generation still proceeds via the deterministic fallback? Trace the call in src/app/api/images/route.ts.
Report concrete defects with file:line, trigger, wrong result. Real bugs only, not style.`,
  },
  {
    key: 'route-integration',
    prompt: `Review src/app/api/images/route.ts and how it calls buildImagePromptFromContent (src/lib/ai/image.ts), plus the imageSchema change in src/lib/validation.ts (new optional content field, max 12000).
Hunt for REAL defects:
- Content resolution precedence: content = request.content, then overridden by stored row.outputText when generationId+DB present. Ownership scoping preserved (where id+sessionId)? Any way to read another session's content?
- The route now awaits an extra Claude call (describeScene) BEFORE the image call. maxDuration=60. Could the added latency push total past 60s and 504? Does it degrade gracefully?
- If content is null/short (<40 chars) or AI disabled, does it fall back to buildImagePrompt deterministically? Confirm the not-saved (no generationId) path still works — an earlier live test posted with no generationId.
- Prompt-injection: outputText (user's own generated copy) is embedded into describeScene's user message inside triple quotes. Could crafted content escape and change behavior harmfully? Is the risk acceptable given it is the user's own session content and output is constrained to a scene string fed to DALL-E?
- The response now returns an enhanced boolean. Any type/shape issue? Does Generator.tsx still read json.imageUrl/json.prompt fine?
Report concrete defects with file:line, trigger, wrong result. Real bugs only.`,
  },
  {
    key: 'prompt-quality',
    prompt: `Evaluate the PROMPT-QUALITY design of the content-aware image step in src/lib/ai/image.ts (describeScene system prompt + SCENE_SCHEMA + assemble() combining "A <leadNoun> showing <scene>" with style/composition/lighting/negative prompt). The user's goal: images that better reflect the actual generated copy (more relevant photos).
Assess for REAL problems that would degrade output quality or make the image model misbehave:
- Could the assembled prompt become too long or internally contradictory (scene implies text/UI despite the negative prompt; scene includes style words that fight the chosen style preset)? The system prompt forbids style/text words in the scene — is that enough, or should assemble() still guard?
- For ad_copy the content is 3 variants; for email it is subject lines + body. Does feeding the whole assembled text (sliced to 2400 chars) to the art director produce a coherent single scene, or could it average into something generic? Any content type where this regresses vs the old topic-only prompt?
- Does keeping the user's chosen STYLE deterministic (scene only sets subject) correctly preserve the style picker's control?
- Is there a case where the enhanced prompt is actually WORSE than the old topic-based one, so the fallback should be preferred?
Report concrete, actionable issues with file:line and a specific fix. Only issues that materially affect image relevance/quality or safety — not nitpicks.`,
  },
]

phase('Review')
const results = await pipeline(
  LENSES,
  (lens) =>
    agent(lens.prompt, {
      label: `review:${lens.key}`,
      phase: 'Review',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['findings'],
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['severity', 'file', 'line', 'summary', 'trigger', 'fix'],
              properties: {
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                file: { type: 'string' },
                line: { type: 'integer' },
                summary: { type: 'string' },
                trigger: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
        },
      },
    }),
  (review, lens) =>
    parallel(
      (review?.findings ?? []).map((f) => () =>
        agent(
          `Adversarially verify this reviewer finding by READING the actual code at ${f.file} near line ${f.line}. Default to false_alarm unless you can construct a concrete failing case or a clear, material quality regression.
Finding: ${f.summary}
Claimed trigger: ${f.trigger}
Proposed fix: ${f.fix}
Confirm only if it is a real runtime bug OR a real, material image-quality/safety regression with a concrete example. If the existing code/fallback already handles it, say false_alarm.`,
          {
            label: `verify:${lens.key}:${f.line}`,
            phase: 'Verify',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['verdict', 'reasoning', 'severity', 'summary', 'file', 'line', 'recommendedFix'],
              properties: {
                verdict: { type: 'string', enum: ['confirmed', 'false_alarm'] },
                reasoning: { type: 'string' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                summary: { type: 'string' },
                file: { type: 'string' },
                line: { type: 'integer' },
                recommendedFix: { type: 'string' },
              },
            },
          },
        ).then((v) => ({ lens: lens.key, ...v })),
      ),
    ),
)

const confirmed = results.filter(Boolean).flat().filter(Boolean).filter((v) => v.verdict === 'confirmed')
const order = { critical: 0, high: 1, medium: 2, low: 3 }
confirmed.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))
log(`Confirmed ${confirmed.length} issue(s) after adversarial verification`)
return { confirmed }
