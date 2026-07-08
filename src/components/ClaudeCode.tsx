"use client";

import { useState } from "react";

const REPO = "https://github.com/ahmed-farahat-pro/magna-test";
const file = (p: string) => `${REPO}/blob/main/${p}`;

// ── The four workflow modes the brief asks to demonstrate ────────────────────
const MODES: { tag: string; title: string; body: string; example: string }[] = [
  {
    tag: "Plan",
    title: "Architecture planning",
    body: "The whole build was steered by a committed CLAUDE.md — the non-negotiables (all AI server-side, no NEXT_PUBLIC secrets), the exact model config, the data model, and a phase-by-phase build order.",
    example:
      "git init → scaffold → Neon + first migration → lib foundations → /api/health + deploy → content generator → image pipeline → improver + history → bonus + docs.",
  },
  {
    tag: "Debug",
    title: "Debugging sessions",
    body: "Real diagnostic loops, not lucky guesses: the upstream error was surfaced first, the root cause traced, then a targeted fix landed as its own commit — often verified against the live site.",
    example:
      "The DALL·E → Blob 502 was traced to a private Blob store and an unsupported API param, then fixed with an /api/img proxy + a model-fallback chain.",
  },
  {
    tag: "Refactor",
    title: "Refactoring",
    body: "Recurring shapes were pulled into single sources of truth: one declarative AI-error classifier across every route, one getActor() collapsing the two identity layers, and a full colour-token migration for theming.",
    example:
      "describeAiError() maps any SDK/network/overload failure to one typed { code, message, retryable } envelope — reused by generate, images, improve, and enforce-voice.",
  },
  {
    tag: "Generate",
    title: "Prompt-driven code generation",
    body: "45 conventional commits of prompt-driven work — routes, prompt strategies, Prisma schema + migrations, React components, and the design system — each scoped, reviewed, and committed.",
    example:
      "Four content formats, each with its own server-side prompt strategy and a strict output guard, generated and wired end-to-end from a single description.",
  },
];

// ── The real debugging log (expandable) ──────────────────────────────────────
type Bug = {
  title: string;
  symptom: string;
  cause: string;
  fix: string;
  commit: string;
  hash: string;
  tag: "bug" | "security" | "regression";
};

const BUGS: Bug[] = [
  {
    title: "The DALL·E → Blob 502 saga",
    tag: "bug",
    symptom: "Image generation returned 502 and images never attached to a post.",
    cause:
      "Three stacked issues: a private Vercel Blob store served URLs the browser couldn't fetch, the image call sent an unsupported response_format param, and image-model access varied per account.",
    fix: "Added an /api/img proxy for private stores, a model-fallback chain (gpt-image-1 → dall-e-3 → dall-e-2), dropped the bad param, and surfaced the real upstream error first for diagnosis.",
    commit: "fix: support private Vercel Blob stores via an /api/img proxy",
    hash: "9ea492e",
  },
  {
    title: "Word export with the photo came out blank",
    tag: "bug",
    symptom: "Exporting a piece to Word with its image produced a document where the image didn't render in Word desktop.",
    cause: "The export used a base64 data-URI <img> inside HTML-in-.doc, which Word desktop refuses to render.",
    fix: "Switched to a real OOXML .docx via the docx library, embedding the PNG as a proper ImageRun media part.",
    commit: "feat(history): per-item Download menu with Text/Word/PDF + image-embedded exports",
    hash: "c67c34a",
  },
  {
    title: "Count guard lived in dead code — then over-corrected",
    tag: "regression",
    symptom: "\"Exactly 3 ad variants\" was asserted in the json_schema path, but the live route streams markdown and bypassed it entirely.",
    cause: "The streaming path had no structural enforcement; adding per-type counts then over-rejected valid LinkedIn posts, whose hashtags aren't reliably #-prefixed.",
    fix: "Added count checks to streamedOutputIssue on the live path — a live test immediately caught the LinkedIn false-positive, so that one guard was removed. Diagnose → fix → verify → correct.",
    commit: "fix: drop the false-positive LinkedIn hashtag guard",
    hash: "1033d77",
  },
  {
    title: "Header stayed on \"Sign in\" after signing in",
    tag: "bug",
    symptom: "After a successful login, the nav still showed \"Sign in\" until a hard reload.",
    cause: "The browser cached GET /api/auth/me, so the post-login re-check served the stale pre-login { user: null }.",
    fix: "cache:\"no-store\" on the fetch, a no-store header on the response, and an auth-changed event so the header re-checks instantly.",
    commit: "feat(admin): admin dashboard, activity tracking + fix stale header after login",
    hash: "08cb572",
  },
  {
    title: "The landing demo scroll-jacked the page on mobile",
    tag: "bug",
    symptom: "On phones the page appeared to auto-scroll up and down on its own.",
    cause: "The self-running demo had no fixed height, so as it cycled through acts its height swung 339px → 800px, shoving everything below it.",
    fix: "Gave the demo a fixed height with internal scroll on mobile, so the outer box stays a constant ~607px and the page never shifts.",
    commit: "feat(mobile+workflow): responsive nav & demo, interactive workflow page",
    hash: "af52bcd",
  },
  {
    title: "Anonymous sessions always counted 0",
    tag: "bug",
    symptom: "The admin dashboard's anonymous-session metric never moved off zero.",
    cause: "Edge middleware pre-mints the session cookie, so by the time the visit endpoint ran, the cookie already existed (minted:false) and session_start never fired.",
    fix: "Deduped with a dedicated acms_visit cookie so each browser is counted exactly once, regardless of when the session id was minted.",
    commit: "feat(admin): admin dashboard, activity tracking + fix stale header after login",
    hash: "08cb572",
  },
  {
    title: "scrypt compare derived its length from the stored value",
    tag: "security",
    symptom: "verifyPassword read the key length out of the (attacker-controllable) stored hash string.",
    cause: "A malformed stored value could steer the timing-safe compare.",
    fix: "Pinned the key length to 32 bytes and rejected any hash that isn't exactly a 16-byte salt + 32-byte key of valid hex — caught in an AI-run security review.",
    commit: "feat(auth): email + password accounts over anonymous sessions (+ security review fixes)",
    hash: "199ca91",
  },
  {
    title: "Stale Turbopack CSS hid the whole new theme",
    tag: "bug",
    symptom: "After the theme migration, accent buttons went transparent and the gradient wordmark didn't render.",
    cause: "The dev server served the OLD compiled globals.css — --accent was undefined — a cached build artifact, confirmed by reading the applied :root rule.",
    fix: "Cleared .next and restarted, then verified the fix with getComputedStyle('--accent') rather than trusting the screenshot.",
    commit: "feat(redesign): rebrand to \"Nova\" + full dark/light theming + real stack logos",
    hash: "a1380f1",
  },
  {
    title: "Activity-chart bars collapsed to nothing",
    tag: "bug",
    symptom: "The admin's 14-day chart rendered its labels but no bars.",
    cause: "The bars used percentage heights, but their parent column had auto height — so the % resolved against 0.",
    fix: "Gave each column h-full so the percentage heights had a fixed reference; later reworked into a stacked registered-vs-anonymous chart.",
    commit: "fix(admin): split activity chart by registered vs anonymous; clarify sign-ups card",
    hash: "3a6ca11",
  },
  {
    title: "Moderation vs. marketing metaphor",
    tag: "bug",
    symptom: "Naive violence keywords would block legitimate copy like \"crush the competition\", \"kill your boredom\", and \"explosive growth\".",
    cause: "Lone violent words appear constantly in marketing language.",
    fix: "Rebuilt the filter around harmful intent (e.g. \"how to kill someone\"), then tested it: 15/15 harmful requests blocked, 20/20 metaphors allowed — and removed a risky \"mailtemp\" token that would have blocked mailtemplate.com.",
    commit: "feat(safety): content moderation + Claude-refusal handling; expand workflow flows",
    hash: "6a59332",
  },
];

const TAG_CLS: Record<Bug["tag"], string> = {
  bug: "border-[var(--slate-border)] bg-[var(--slate-tint)] text-[var(--slate)]",
  security: "border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-strong)]",
  regression: "border-[var(--rust-border)] bg-[var(--rust-tint)] text-[var(--rust)]",
};

// ── AI-native workflow highlights ────────────────────────────────────────────
const AI_NATIVE: { title: string; body: string; link?: string; linkLabel?: string }[] = [
  {
    title: "A 7-agent grading panel",
    body: "Six independent dimension examiners plus a chief synthesizer graded the build against the rubric — reading the code AND the live site — driving the score from 89/100 to 104/110. Each finding became a concrete fix.",
    link: file("docs/claude-code/workflows"),
    linkLabel: "workflow scripts",
  },
  {
    title: "A 53/53 live E2E harness",
    body: "An end-to-end harness exercised every feature and adversarial scenario against production — generation, images, exports, auth, session isolation, forged-cookie rejection, and rate-limit 429s — all green before shipping.",
  },
  {
    title: "Adversarial review before merge",
    body: "Findings were re-checked by independent skeptic passes so plausible-but-wrong claims didn't survive — the same pattern used to verify the security and moderation work.",
    link: file("docs/claude-code/WORKFLOW.md"),
    linkLabel: "WORKFLOW.md",
  },
];

// ── Build phases (from the commit history) ───────────────────────────────────
const PHASES: { phase: string; items: string[] }[] = [
  {
    phase: "Foundations",
    items: [
      "Scaffold, Neon + first migration, lib foundations, graceful /api/health, deploy",
      "Content generator — four formats, four server-side prompt strategies",
      "Image pipeline — DALL·E → permanent Blob URL (+ the 502 saga)",
      "Improver, session-scoped history, live token streaming",
    ],
  },
  {
    phase: "Polish & review",
    items: [
      "Landing page + self-running 3-act demo, \"under the hood\" architecture",
      "Content-aware images, multi-format export, declarative AI errors",
      "First 7-agent grade (89/100) → remediation across security, guards, logging, a11y",
    ],
  },
  {
    phase: "Beyond the brief",
    items: [
      "Durable Upstash rate limiting; multiple brand voices + hard avoid-enforcement",
      "Email + password auth with anonymous-data migration; disposable-email + strength + consent",
      "Admin dashboard + full activity tracking; content moderation + Claude-refusal handling",
    ],
  },
  {
    phase: "Product & craft",
    items: [
      "Interactive Workflow page, fixes log, tech-stack \"why\", admin-managed landing video",
      "Rebrand to Nova — full dark/light theming (720 colour refs migrated), real logos",
      "Re-grade: 104/110",
    ],
  },
];

const ARTIFACTS: { label: string; href: string; note: string }[] = [
  { label: "CLAUDE.md", href: file("CLAUDE.md"), note: "the steering doc — non-negotiables, model config, build order" },
  { label: "docs/claude-code/", href: file("docs/claude-code"), note: "the workflow write-up + committed prompt log" },
  { label: "fixes.md", href: file("fixes.md"), note: "10 remediation rounds with flow diagrams" },
  { label: "VIDEO_SCRIPT.md", href: file("VIDEO_SCRIPT.md"), note: "the walkthrough shooting script" },
];

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center">
      <div className="text-2xl font-extrabold tabular-nums text-[var(--ink)]">{n}</div>
      <div className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[var(--muted-2)]">
        {label}
      </div>
    </div>
  );
}

export default function ClaudeCode() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      {/* stats */}
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n="45" label="commits" />
        <Stat n="10+" label="debug arcs" />
        <Stat n="7-agent" label="AI review" />
        <Stat n="89→104" label="graded score" />
      </div>

      {/* the four modes */}
      <section className="mt-14">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          Four ways Claude Code drove the build
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[var(--body)]">
          The exact modes the brief asks to see — each backed by real work in this repo.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MODES.map((m) => (
            <div key={m.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="rounded-md bg-grad px-2 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-white">
                {m.tag}
              </span>
              <h3 className="mt-3 text-lg font-bold text-[var(--ink)]">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--body)]">{m.body}</p>
              <p className="mt-3 rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--accent-strong)]">In this build: </span>
                {m.example}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* debugging log */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          The debugging log
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[var(--body)]">
          Every real bug — the symptom, the root cause, the fix, and the commit. Tap one to open it.
        </p>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-2">
          {BUGS.map((b, i) => {
            const isOpen = open === i;
            return (
              <div key={b.title} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.05em] ${TAG_CLS[b.tag]}`}>
                    {b.tag}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]">{b.title}</span>
                  <span className="hidden shrink-0 font-mono text-[0.66rem] text-[var(--muted)] sm:inline">{b.hash}</span>
                  <span className={`shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true">›</span>
                </button>
                {isOpen && (
                  <div className="animate-fade-in border-t border-[var(--border-2)] px-4 py-3.5">
                    <dl className="flex flex-col gap-2.5 text-sm">
                      {([["Symptom", b.symptom], ["Root cause", b.cause], ["The fix", b.fix]] as [string, string][]).map(([k, v]) => (
                        <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                          <dt className="shrink-0 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted-2)] sm:w-24 sm:pt-0.5">{k}</dt>
                          <dd className="leading-relaxed text-[var(--body)]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <a
                      href={`${REPO}/commit/${b.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--accent-strong)] hover:underline"
                    >
                      {b.hash} · {b.commit} ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* AI-native workflow */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          A demonstrated AI-native workflow
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[var(--body)]">
          Not just writing code — using AI to plan, review, and verify it, adversarially.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {AI_NATIVE.map((w) => (
            <div key={w.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-base font-bold text-[var(--ink)]">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--body)]">{w.body}</p>
              {w.link && (
                <a href={w.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-mono text-xs text-[var(--accent-strong)] hover:underline">
                  {w.linkLabel} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* build timeline */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          How it unfolded
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
          {PHASES.map((p, i) => (
            <div key={p.phase} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-tint)] font-mono text-xs font-bold text-[var(--accent-strong)]">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold text-[var(--ink)]">{p.phase}</h3>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-[var(--body)]">
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true">›</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* artifacts */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          The receipts
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[var(--body)]">
          It&apos;s all committed — the steering doc, the prompt log, and the remediation write-ups.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {ARTIFACTS.map((a) => (
            <a
              key={a.label}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent-border)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-[var(--accent-strong)]">{a.label}</span>
                <span className="text-[var(--muted)] group-hover:text-[var(--accent)]" aria-hidden="true">↗</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--body)]">{a.note}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
