"use client";

import { useState } from "react";

/**
 * "Under the hood" — an onboarding section that visualizes how the app is wired:
 * a layered architecture map (what lives where), per-feature call flows (what
 * calls what, step by step), and a core-vs-bonus breakdown. Pure static content.
 */

type Tag = "core" | "bonus" | "ext";

const TAG_CLS: Record<Tag, string> = {
  core: "border-[#bfe0d0] bg-[#e6f2ec] text-[#0a5346]",
  bonus: "border-[#e3c9bd] bg-[#f7e8e0] text-[#8a3315]",
  ext: "border-[#c4d3da] bg-[#eef4f6] text-[#2f5563]",
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
      { t: "Settings · brand voice", tag: "bonus" },
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
      { t: "/api/img", tag: "bonus" },
    ],
    edge: "validate → call lib services",
  },
  {
    name: "Lib services",
    chips: [
      { t: "ai/generate", tag: "core" },
      { t: "ai/image", tag: "core" },
      { t: "validation (zod)", tag: "core" },
      { t: "session", tag: "core" },
      { t: "rateLimit", tag: "core" },
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
    ],
  },
];

// ── Per-feature call flows ───────────────────────────────────────────────────
type Step = { actor: string; desc: string; tag?: Tag; tagLabel?: string };
type FlowKey = "Generate" | "Image" | "Improve" | "History";

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
      desc: "Server-side only: zod validation, in-memory rate-limit, and your signed session.",
    },
    {
      actor: "getStreamConfig()",
      desc: "Picks the per-format prompt strategy (blog / LinkedIn / ad / email) and folds in the brand voice.",
    },
    {
      actor: "anthropic().messages.stream()",
      desc: "Claude Sonnet 5 writes the copy and streams it back token-by-token.",
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
      desc: "Server-side validation, session scoping, and rate-limit.",
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
};

const FLOW_KEYS = Object.keys(FLOWS) as FlowKey[];

const CORE_LIST = [
  "Four content formats, each with its own prompt strategy",
  "All AI runs server-side — no keys ever reach the browser",
  "AI image generation, re-hosted on permanent Blob storage",
  "Anonymous session-scoped history (create, read, delete)",
  "The content improver with goal-driven rewrites",
];

const BONUS_LIST = [
  "Brand voice — personality, formality, keywords & words to avoid",
  "Image style picker (photographic, 3D, flat, gradient…)",
  "Live token streaming as Claude writes",
  "Content-aware image prompts (an art-director step)",
  "Export to Text / Word / PDF, with the image embedded",
  "Animations, polish & this self-running onboarding demo",
];

export default function Architecture() {
  const [flow, setFlow] = useState<FlowKey>("Generate");
  const steps = FLOWS[flow];

  return (
    <section className="border-t border-[#d9dfd8] bg-[#f4f7f3]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
            Under the hood
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
            How it actually works — what calls what
          </h2>
          <p className="mt-3 text-[#3c4a54]">
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
            <span key={t} className="flex items-center gap-2 text-xs text-[#3c4a54]">
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
          <div className="animate-fade-up rounded-2xl border border-[#d9dfd8] bg-white p-5">
            <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
              Architecture map
            </h3>
            <div className="flex flex-col">
              {LAYERS.map((layer, i) => (
                <div key={layer.name}>
                  <div className="rounded-xl border border-[#e2e8e2] bg-[#fbfdfb] p-3">
                    <div className="mb-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
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
                    <div className="flex flex-col items-center py-1 text-[#9fb0a5]">
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
          <div className="animate-fade-up rounded-2xl border border-[#d9dfd8] bg-white p-5">
            <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
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
                        ? "border-[#0e7a63] bg-[#e6f2ec] text-[#0a5346]"
                        : "border-[#d9dfd8] bg-white text-[#3c4a54] hover:border-[#b9c6bd]"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>

            <ol
              key={flow}
              className="animate-fade-in relative mt-6 ml-3 border-l border-[#d9dfd8]"
            >
              {steps.map((s, i) => (
                <li key={i} className="relative mb-5 ml-6 last:mb-0">
                  <span className="absolute -left-9 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#0e7a63] bg-[#e6f2ec] font-mono text-[0.66rem] font-bold text-[#0a5346]">
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-[#f2f5f1] px-1.5 py-0.5 font-mono text-[0.74rem] text-[#1c241e]">
                      {s.actor}
                    </code>
                    {s.tag && s.tagLabel && (
                      <TagPill tag={s.tag}>{`★ ${s.tagLabel}`}</TagPill>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#3c4a54]">
                    {s.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Core vs Bonus ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="animate-fade-up rounded-2xl border border-[#bfe0d0] bg-[#e9f4ee] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-[#0e7a63] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-white">
                CORE
              </span>
              <span className="text-sm font-semibold text-[#0a5346]">
                The graded assessment
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {CORE_LIST.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-[#26332b]">
                  <span className="mt-0.5 text-[#0e7a63]" aria-hidden="true">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-fade-up rounded-2xl border border-[#e3c9bd] bg-[#f9ede5] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-[#b7451e] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-white">
                BONUS
              </span>
              <span className="text-sm font-semibold text-[#8a3315]">
                The extras, layered on top
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {BONUS_LIST.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-[#3d2318]">
                  <span className="mt-0.5 text-[#b7451e]" aria-hidden="true">
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
