"use client";

import { useMemo, useState } from "react";

// ── Node vocabulary ──────────────────────────────────────────────────────────
type NodeType = "user" | "system" | "ai" | "data" | "success";

const TYPE: Record<
  NodeType,
  { label: string; box: string; badge: string; dot: string }
> = {
  user: {
    label: "You",
    box: "border-[#bfe0d0] bg-[#eaf5ef]",
    badge: "bg-[#0e7a63] text-white",
    dot: "bg-[#0e7a63]",
  },
  system: {
    label: "Server",
    box: "border-[#c4d3da] bg-[#eef4f6]",
    badge: "bg-[#2f5563] text-white",
    dot: "bg-[#2f5563]",
  },
  ai: {
    label: "Claude / OpenAI",
    box: "border-[#d5c9e8] bg-[#f2eefa]",
    badge: "bg-[#5b3f8a] text-white",
    dot: "bg-[#5b3f8a]",
  },
  data: {
    label: "Database / Storage",
    box: "border-[#e6d3ad] bg-[#f9f2e4]",
    badge: "bg-[#7a5a2e] text-white",
    dot: "bg-[#7a5a2e]",
  },
  success: {
    label: "Done",
    box: "border-[#0e7a63] bg-[#e6f2ec]",
    badge: "bg-[#0e7a63] text-white",
    dot: "bg-[#0e7a63]",
  },
};

type Node = {
  type: NodeType;
  title: string;
  body: string;
  onError?: string; // what happens when this step fails (technical flow)
};

type Flow = {
  key: "simple" | "technical";
  tab: string;
  audience: string;
  blurb: string;
  nodes: Node[];
};

const FLOWS: Flow[] = [
  {
    key: "simple",
    tab: "For everyone",
    audience: "The user's-eye view",
    blurb:
      "What actually happens when you make a piece of content — no jargon, just the journey from idea to finished, saved, shareable content.",
    nodes: [
      {
        type: "user",
        title: "Describe your idea",
        body: "Pick a format — blog, LinkedIn, ad, or email — then give a topic, tone, and audience. Add a saved brand voice if you have one.",
      },
      {
        type: "ai",
        title: "Claude writes your copy — live",
        body: "The finished text streams in word-by-word, so you watch it come together instead of waiting on a spinner.",
      },
      {
        type: "ai",
        title: "A matching image is painted",
        body: "An art director reads your actual copy and generates an on-brand picture that reflects the message, in the style you choose.",
      },
      {
        type: "user",
        title: "Refine it in one click",
        body: "Send the copy to the improver to make it shorter, punchier, more formal, or SEO-friendly — and see exactly what changed.",
      },
      {
        type: "data",
        title: "Everything is saved",
        body: "Each piece lands in your history, scoped to you. Sign up and it follows you across devices.",
      },
      {
        type: "success",
        title: "Export & share",
        body: "Download any piece as plain text, a real Word .docx, or a PDF — with the generated image baked right in.",
      },
    ],
  },
  {
    key: "technical",
    tab: "Under the hood",
    audience: "The engineer's view",
    blurb:
      "The real request pipeline behind a single generation — every hop, and how each failure mode is caught and turned into a clean, typed response. This is the /api/generate path.",
    nodes: [
      {
        type: "user",
        title: "Browser → POST /api/generate",
        body: "A client component sends topic + tone + audience + format. No LLM or image keys ever reach the browser — it only ever talks to /api/*.",
      },
      {
        type: "system",
        title: "Edge middleware · signed session",
        body: "An HMAC-signed session cookie is minted on the first navigation. getActor() resolves it to one owner id (an account when signed in, else an anonymous id).",
        onError: "No SESSION_SECRET in prod → fail closed: no cookie is signed, the API rejects cleanly rather than trusting a forgeable default.",
      },
      {
        type: "system",
        title: "Rate limit · Upstash Redis",
        body: "A sliding-window check, keyed by the owner id (Upstash when configured, in-memory fallback otherwise).",
        onError: "Over the limit → 429 RATE_LIMITED with a retry-after header. The stream never starts.",
      },
      {
        type: "system",
        title: "Validate input · zod",
        body: "The body is parsed at the boundary against a strict schema (enums for format/tone, length caps).",
        onError: "Invalid → 400 VALIDATION_ERROR in the single envelope { error: { code, message, requestId, details } }.",
      },
      {
        type: "ai",
        title: "Claude streams the copy",
        body: "getStreamConfig() picks the per-format prompt strategy and folds in the brand voice; anthropic().messages.stream() emits tokens as text/plain.",
        onError: "SDK / network / overload → describeAiError() maps it to a typed 502/503 with a plain-language, retryable-or-not message.",
      },
      {
        type: "system",
        title: "Output guard · streamedOutputIssue()",
        body: "The finished copy is asserted for structure — e.g. ad copy must have 3 variants, a blog ≥3 H2 sections.",
        onError: "Degenerate / incomplete output → a retry signal is streamed instead of persisting junk.",
      },
      {
        type: "data",
        title: "Persist · Prisma → Neon",
        body: "The copy is written to the single Generation table, scoped where { sessionId }, and the resolved model id is recorded.",
        onError: "DB write fails → best-effort: the copy is still returned to you; the error is logged with the requestId, not thrown.",
      },
      {
        type: "data",
        title: "track() · activity log",
        body: "A best-effort ActivityEvent row records the action (type + actor) for the admin dashboard — it can never slow or break the response.",
      },
      {
        type: "success",
        title: "Trailer → browser",
        body: "A record-separator byte then a small JSON trailer { id, saved } closes the stream, so the client knows it was saved and can attach an image next.",
      },
    ],
  },
];

// ── Icons per node type ──────────────────────────────────────────────────────
function NodeIcon({ type }: { type: NodeType }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" as const, "aria-hidden": true };
  const s = { stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "user")
    return (<svg {...common}><circle cx="12" cy="8" r="3.4" {...s} /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" {...s} /></svg>);
  if (type === "ai")
    return (<svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" {...s} /><circle cx="12" cy="12" r="3" {...s} /></svg>);
  if (type === "data")
    return (<svg {...common}><ellipse cx="12" cy="6" rx="7" ry="3" {...s} /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" {...s} /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" {...s} /></svg>);
  if (type === "success")
    return (<svg {...common}><circle cx="12" cy="12" r="9" {...s} /><path d="M8 12l3 3 5-6" {...s} /></svg>);
  return (<svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" {...s} /><path d="M7 9h10M7 13h6" {...s} /></svg>);
}

export default function WorkflowFlows() {
  const [flowKey, setFlowKey] = useState<Flow["key"]>("simple");
  const flow = useMemo(() => FLOWS.find((f) => f.key === flowKey)!, [flowKey]);
  const [revealed, setRevealed] = useState(1); // how many nodes are shown

  const total = flow.nodes.length;
  const complete = revealed >= total;

  function pick(key: Flow["key"]) {
    setFlowKey(key);
    setRevealed(1);
  }
  function advance() {
    setRevealed((r) => Math.min(total, r + 1));
  }

  return (
    <div>
      {/* flow switcher */}
      <div className="flex flex-col items-center gap-3">
        <div
          role="tablist"
          aria-label="Workflow views"
          className="inline-flex rounded-xl border border-[#d9dfd8] bg-white p-1"
        >
          {FLOWS.map((f) => {
            const active = f.key === flowKey;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => pick(f.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#0e7a63] text-white"
                    : "text-[#3c4a54] hover:bg-[#f2f5f1]"
                }`}
              >
                {f.tab}
              </button>
            );
          })}
        </div>
        <p className="max-w-xl text-center text-sm text-[#3c4a54]">
          <span className="font-semibold text-[#141a16]">{flow.audience}.</span>{" "}
          {flow.blurb}
        </p>
      </div>

      {/* progress + controls */}
      <div className="mx-auto mt-6 flex max-w-lg items-center justify-between gap-3">
        <span className="font-mono text-xs text-[#5f6960]">
          Step {Math.min(revealed, total)} / {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRevealed(total)}
            disabled={complete}
            className="rounded-lg border border-[#d9dfd8] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346] disabled:opacity-40"
          >
            Reveal all
          </button>
          <button
            onClick={() => setRevealed(1)}
            className="rounded-lg border border-[#d9dfd8] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
          >
            Restart
          </button>
        </div>
      </div>

      {/* the flow */}
      <ol className="mx-auto mt-6 flex max-w-lg flex-col items-stretch">
        {flow.nodes.slice(0, revealed).map((n, i) => {
          const t = TYPE[n.type];
          const isFrontier = i === revealed - 1 && !complete;
          const clickable = isFrontier;
          return (
            <li key={`${flowKey}-${i}`} className="flex flex-col items-center">
              {/* connector from the previous node */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="animate-grow-down my-1 h-6 w-px bg-[#c7d2c9]"
                />
              )}

              <button
                type="button"
                onClick={clickable ? advance : undefined}
                aria-label={clickable ? `Reveal step ${i + 2}` : undefined}
                className={`animate-fade-up w-full rounded-2xl border ${t.box} p-4 text-left transition-all ${
                  clickable
                    ? "animate-soft-pulse cursor-pointer hover:-translate-y-0.5"
                    : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.badge}`}
                  >
                    <NodeIcon type={n.type} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                        {String(i + 1).padStart(2, "0")} · {t.label}
                      </span>
                    </div>
                    <h3 className="text-[0.95rem] font-bold leading-tight text-[#141a16]">
                      {n.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#3c4a54]">
                  {n.body}
                </p>

                {/* error branch (technical flow) */}
                {n.onError && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-[#e3c9bd] bg-[#f9ede5] px-3 py-2">
                    <span className="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#8a3315]">
                      on error
                    </span>
                    <span className="text-xs leading-relaxed text-[#7a3618]">
                      {n.onError}
                    </span>
                  </div>
                )}

                {/* click affordance on the frontier node */}
                {clickable && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-black/5 pt-2.5 text-xs font-semibold text-[#0a5346]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0e7a63] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0e7a63]" />
                    </span>
                    {i === 0 ? "Click to start — see what happens next" : "Click to reveal the next step →"}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* completion note */}
      {complete && (
        <div className="animate-fade-up mx-auto mt-4 max-w-lg rounded-xl border border-[#bfe0d0] bg-[#e9f4ee] px-4 py-3 text-center">
          <p className="text-sm font-semibold text-[#0a5346]">
            That&apos;s the whole {flowKey === "simple" ? "journey" : "pipeline"}.
          </p>
          <p className="mt-1 text-xs text-[#26332b]">
            {flowKey === "simple"
              ? "Switch to “Under the hood” to see the engineering behind it."
              : "Every failure mode above returns the one typed error envelope — nothing 500s silently."}
          </p>
        </div>
      )}
    </div>
  );
}
