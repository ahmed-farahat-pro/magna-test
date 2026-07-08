"use client";

import { useState } from "react";

/**
 * "Under the hood" — an onboarding section that visualizes how the app is wired:
 * a layered architecture map (what lives where), per-feature call flows (what
 * calls what, step by step), and a core-vs-bonus breakdown. Pure static content.
 */

type Tag = "core" | "bonus" | "ext";

const TAG_CLS: Record<Tag, string> = {
  core: "border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-strong)]",
  bonus: "border-[var(--rust-border)] bg-[var(--rust-tint)] text-[var(--rust)]",
  ext: "border-[var(--slate-border)] bg-[var(--slate-tint)] text-[var(--slate)]",
};

function Chip({ children, tag }: { children: string; tag: Tag }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[0.68rem] font-medium ${TAG_CLS[tag]}`}
    >
      {children}
    </span>
  );
}

function TagPill({ tag, children }: { tag: Tag; children: string }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.06em] ${TAG_CLS[tag]}`}
    >
      {children}
    </span>
  );
}

// ── Layered architecture map ─────────────────────────────────────────────────
type Layer = {
  name: string;
  chips: { t: string; tag: Tag }[];
  edge?: string;
};

const LAYERS: Layer[] = [
  {
    name: "Browser · client components",
    chips: [
      { t: "Landing demo", tag: "bonus" },
      { t: "Generator", tag: "core" },
      { t: "Improver", tag: "core" },
      { t: "History", tag: "core" },
      { t: "Account · sign in", tag: "core" },
      { t: "Settings · brand voices", tag: "bonus" },
      { t: "Admin dashboard", tag: "bonus" },
    ],
    edge: "fetch /api/*  (no keys in the browser)",
  },
  {
    name: "Edge middleware",
    chips: [{ t: "signed session cookie (HMAC)", tag: "core" }],
    edge: "on every request",
  },
  {
    name: "API routes · server (nodejs runtime)",
    chips: [
      { t: "/api/generate", tag: "core" },
      { t: "/api/images", tag: "core" },
      { t: "/api/improve", tag: "core" },
      { t: "/api/history", tag: "core" },
      { t: "/api/auth/*", tag: "core" },
      { t: "/api/brand-voice", tag: "bonus" },
      { t: "/api/enforce-voice", tag: "bonus" },
      { t: "/api/admin/*", tag: "bonus" },
      { t: "/api/video", tag: "bonus" },
      { t: "/api/track/visit", tag: "bonus" },
      { t: "/api/img", tag: "bonus" },
    ],
    edge: "validate → call lib services",
  },
  {
    name: "Lib services",
    chips: [
      { t: "ai/generate", tag: "core" },
      { t: "ai/image", tag: "core" },
      { t: "ai/moderation", tag: "bonus" },
      { t: "validation (zod)", tag: "core" },
      { t: "session · getActor", tag: "core" },
      { t: "auth (scrypt)", tag: "core" },
      { t: "migrateAnon", tag: "core" },
      { t: "rateLimit", tag: "core" },
      { t: "track", tag: "bonus" },
      { t: "admin", tag: "bonus" },
      { t: "db (Prisma)", tag: "core" },
      { t: "blob", tag: "core" },
      { t: "export", tag: "bonus" },
    ],
    edge: "talk to external services",
  },
  {
    name: "External services",
    chips: [
      { t: "Claude · Anthropic", tag: "ext" },
      { t: "OpenAI · images", tag: "ext" },
      { t: "Vercel Blob", tag: "ext" },
      { t: "Neon · Postgres", tag: "ext" },
      { t: "Upstash · Redis", tag: "ext" },
    ],
  },
];

// ── Per-feature call flows ───────────────────────────────────────────────────
type Step = { actor: string; desc: string; tag?: Tag; tagLabel?: string };
type FlowKey = "Generate" | "Image" | "Improve" | "History" | "Account" | "Admin";

const FLOWS: Record<FlowKey, Step[]> = {
  Generate: [
    {
      actor: "Generator.tsx",
      desc: "You pick a format, topic, tone & audience — and can switch on a saved brand voice.",
      tag: "bonus",
      tagLabel: "brand voice",
    },
    {
      actor: "POST /api/generate",
      desc: "Server-side only: zod validation, durable rate-limiting, and your signed session (an account when signed in, else anonymous).",
    },
    {
      actor: "screenContent()",
      desc: "A safety check blocks harmful requests before any AI runs — ordinary marketing metaphor (“crush the competition”) always passes.",
      tag: "bonus",
      tagLabel: "moderation",
    },
    {
      actor: "getStreamConfig()",
      desc: "Picks the per-format prompt strategy (blog / LinkedIn / ad / email) and folds in the brand voice.",
    },
    {
      actor: "anthropic().messages.stream()",
      desc: "Claude claude-sonnet-5 writes the copy and streams it back token-by-token; a refusal is caught, never streamed.",
      tag: "bonus",
      tagLabel: "live streaming",
    },
    {
      actor: "→ your browser",
      desc: "Tokens render live with a typing caret; a trailer carries the saved id.",
    },
    {
      actor: "prisma.generation.create()",
      desc: "The finished copy is saved to Neon, scoped to your session id.",
    },
  ],
  Image: [
    {
      actor: "Generator.tsx",
      desc: "Click “Generate matching image”, optionally choosing a visual style.",
      tag: "bonus",
      tagLabel: "style picker",
    },
    {
      actor: "POST /api/images",
      desc: "Validates, then loads your generation with where { id, sessionId } — ownership-scoped.",
    },
    {
      actor: "buildImagePromptFromContent()",
      desc: "describeScene() asks Claude to turn your actual copy into one concrete visual scene.",
      tag: "bonus",
      tagLabel: "content-aware",
    },
    {
      actor: "generateImageB64()",
      desc: "OpenAI renders the image, with an automatic model-fallback chain.",
    },
    {
      actor: "uploadPngFromBase64()",
      desc: "The PNG is stored permanently in Vercel Blob (public URL, or an /api/img proxy for private stores).",
    },
    {
      actor: "attach imageUrl → row",
      desc: "The URL is written onto your generation; it shows on the card and in History.",
    },
  ],
  Improve: [
    {
      actor: "Improver.tsx",
      desc: "Reuse or paste text, then pick a goal — shorter, more persuasive, more formal, SEO, re-audience.",
    },
    {
      actor: "POST /api/improve",
      desc: "Server-side validation, the same safety screen, owner scoping, and durable rate-limiting.",
    },
    {
      actor: "improve()",
      desc: "Claude rewrites toward the goal and returns structured JSON: the new copy plus a “what changed”.",
    },
    {
      actor: "prisma.generation.create()",
      desc: "Saved as an IMPROVE row alongside your generations, in the same history.",
    },
  ],
  History: [
    {
      actor: "History.tsx",
      desc: "GET /api/history?page — asks the server for your saved work.",
    },
    {
      actor: "prisma.generation.findMany()",
      desc: "where { sessionId } — you only ever see and touch your own session’s content.",
    },
    {
      actor: "cards render",
      desc: "Each piece shows its copy and matching image; open one for the full view.",
    },
    {
      actor: "Download ▾",
      desc: "Export any piece as Text, Word (.docx) or PDF — with the generated image embedded.",
      tag: "bonus",
      tagLabel: "export",
    },
  ],
  Account: [
    {
      actor: "account/page.tsx",
      desc: "Sign up with email + password. A live strength meter and disposable-email block guard the form.",
      tag: "bonus",
      tagLabel: "validation",
    },
    {
      actor: "POST /api/auth/signup",
      desc: "IP-rate-limited, zod-validated, temp-mail rejected; the password is hashed with scrypt (no plaintext).",
    },
    {
      actor: "claimAnonData()",
      desc: "In one transaction, everything you made anonymously is re-owned to your new account.",
      tag: "core",
      tagLabel: "migration",
    },
    {
      actor: "setAuthCookie()",
      desc: "A 7-day HMAC-signed token. From now on getSessionId() resolves to your durable account id, across devices.",
    },
    {
      actor: "→ header updates",
      desc: "The nav re-checks /api/auth/me (no-store) and swaps “Sign in” for your email + Sign out.",
    },
  ],
  Admin: [
    {
      actor: "track() on every action",
      desc: "generate / image / improve / signup / login each append one ActivityEvent — best-effort, never blocking.",
      tag: "bonus",
      tagLabel: "tracking",
    },
    {
      actor: "POST /api/track/visit",
      desc: "Records exactly one session_start per new anonymous browser, for an accurate visitor count.",
    },
    {
      actor: "POST /api/admin/login",
      desc: "Env-configured operator credentials (constant-time check, IP-rate-limited) mint an HMAC admin cookie.",
    },
    {
      actor: "GET /api/admin/stats + /users",
      desc: "Aggregate traffic, usage-by-type, a 14-day chart, the user/anon split, and per-user counts.",
    },
    {
      actor: "AdminDashboard.tsx",
      desc: "Cards, an activity feed (who did what, when), and delete-user — which cascades all of their data.",
      tag: "bonus",
      tagLabel: "management",
    },
  ],
};

const FLOW_KEYS = Object.keys(FLOWS) as FlowKey[];

const CORE_LIST = [
  "Four content formats, each with its own prompt strategy",
  "All AI runs server-side — no keys ever reach the browser",
  "AI image generation, re-hosted on permanent Blob storage",
  "Session-scoped history (create, read, delete, export)",
  "The content improver with goal-driven rewrites",
  "Email + password accounts — anonymous work migrates on sign-up",
];

const BONUS_LIST = [
  "Multiple brand voices — create / edit / delete, pick one per generation",
  "Hard “avoid”-word enforcement (detect + one-click rewrite)",
  "Content-aware image prompts (an art-director step) + style picker",
  "Content safety — harmful requests blocked, Claude refusals handled",
  "Live token streaming as Claude writes",
  "Export to Text / Word / PDF, with the image embedded",
  "Durable rate limiting (Upstash Redis, in-memory fallback)",
  "Admin dashboard — traffic, usage & user management (+ landing video)",
  "Full activity tracking (registered vs anonymous, by action type)",
  "Per-piece token, model & USD cost — with per-user spend in the admin",
  "Light & dark themes with a persisted toggle",
  "Animations, polish & this self-running onboarding demo",
];

export default function Architecture() {
  const [flow, setFlow] = useState<FlowKey>("Generate");
  const steps = FLOWS[flow];

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface-2)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            Under the hood
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            How it actually works — what calls what
          </h2>
          <p className="mt-3 text-[var(--body)]">
            Every layer, every hop. The core assessment features and the bonus
            extras, side by side.
          </p>
        </div>

        {/* legend */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {(
            [
              ["core", "Core"],
              ["bonus", "Bonus"],
              ["ext", "External service"],
            ] as [Tag, string][]
          ).map(([t, label]) => (
            <span key={t} className="flex items-center gap-2 text-xs text-[var(--body)]">
              <span
                className={`h-3.5 w-3.5 rounded border ${TAG_CLS[t]}`}
                aria-hidden="true"
              />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* ── Architecture map ── */}
          <div className="animate-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
              Architecture map
            </h3>
            <div className="flex flex-col">
              {LAYERS.map((layer, i) => (
                <div key={layer.name}>
                  <div className="rounded-xl border border-[var(--border-2)] bg-[var(--surface-3)] p-3">
                    <div className="mb-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted-2)]">
                      {layer.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.chips.map((c) => (
                        <Chip key={c.t} tag={c.tag}>
                          {c.t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {i < LAYERS.length - 1 && (
                    <div className="flex flex-col items-center py-1 text-[var(--accent-border)]">
                      {layer.edge && (
                        <span className="font-mono text-[0.66rem] uppercase tracking-[0.06em]">
                          {layer.edge}
                        </span>
                      )}
                      <span className="text-sm leading-none" aria-hidden="true">
                        ▼
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Per-feature call flow ── */}
          <div className="animate-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
              Call flow — step by step
            </h3>
            <div
              role="tablist"
              aria-label="Feature call flows"
              className="flex flex-wrap gap-1.5"
            >
              {FLOW_KEYS.map((k) => {
                const active = k === flow;
                return (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFlow(k)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--body)] hover:border-[var(--accent-border)]"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>

            <ol
              key={flow}
              className="animate-fade-in relative mt-6 ml-3 border-l border-[var(--border)]"
            >
              {steps.map((s, i) => (
                <li key={i} className="relative mb-5 ml-6 last:mb-0">
                  <span className="absolute -left-9 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent-tint)] font-mono text-[0.66rem] font-bold text-[var(--accent-strong)]">
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.74rem] text-[var(--ink-2)]">
                      {s.actor}
                    </code>
                    {s.tag && s.tagLabel && (
                      <TagPill tag={s.tag}>{`★ ${s.tagLabel}`}</TagPill>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--body)]">
                    {s.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Core vs Bonus ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="animate-fade-up rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-tint)] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-white">
                CORE
              </span>
              <span className="text-sm font-semibold text-[var(--accent-strong)]">
                The graded assessment
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {CORE_LIST.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-[var(--accent-strong)]">
                  <span className="mt-0.5 text-[var(--accent)]" aria-hidden="true">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-fade-up rounded-2xl border border-[var(--rust-border)] bg-[var(--rust-tint)] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-[var(--rust-2)] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-white">
                BONUS
              </span>
              <span className="text-sm font-semibold text-[var(--rust)]">
                The extras, layered on top
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {BONUS_LIST.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-[var(--rust)]">
                  <span className="mt-0.5 text-[var(--rust-2)]" aria-hidden="true">
                    ★
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
