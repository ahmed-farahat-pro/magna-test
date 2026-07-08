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
    box: "border-[var(--accent-border)] bg-[var(--accent-tint)]",
    badge: "bg-[var(--accent)] text-white",
    dot: "bg-[var(--accent)]",
  },
  system: {
    label: "Server",
    box: "border-[var(--slate-border)] bg-[var(--slate-tint)]",
    badge: "bg-[var(--slate)] text-white",
    dot: "bg-[var(--slate)]",
  },
  ai: {
    label: "Claude / OpenAI",
    box: "border-[var(--violet-border)] bg-[var(--violet-tint)]",
    badge: "bg-[var(--violet)] text-white",
    dot: "bg-[var(--violet)]",
  },
  data: {
    label: "Database / Storage",
    box: "border-[var(--amber-border)] bg-[var(--amber-tint)]",
    badge: "bg-[var(--amber)] text-white",
    dot: "bg-[var(--amber)]",
  },
  success: {
    label: "Done",
    box: "border-[var(--accent)] bg-[var(--accent-tint)]",
    badge: "bg-[var(--accent)] text-white",
    dot: "bg-[var(--accent)]",
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
      "The whole journey — brand voice, generation, images, improving, history, and export — in plain language, with the safety check that keeps it on the rails.",
    nodes: [
      {
        type: "user",
        title: "Save a brand voice (optional)",
        body: "In Settings, describe your brand once — personality, formality, words to use, and words to avoid. You can keep several and pick one per piece; it's reused across everything you make.",
      },
      {
        type: "user",
        title: "Describe your idea",
        body: "Pick a format — blog, LinkedIn, ad, or email — then give a topic, tone, and audience, and choose a saved voice to write in.",
      },
      {
        type: "system",
        title: "One click is enough",
        body: "The moment you press Generate the button locks, and the server runs only one request per session at a time — so an impatient double-tap never starts two jobs or charges you twice.",
      },
      {
        type: "system",
        title: "A quick safety check",
        body: "Before anything is written, your request is screened. Topics that promote real violence or other harm are politely declined — while everyday marketing language like “crush the competition” or a “killer feature” is always fine.",
      },
      {
        type: "ai",
        title: "Claude writes your copy — live",
        body: "The finished text streams in word-by-word in your brand voice, so you watch it come together instead of waiting on a spinner.",
      },
      {
        type: "ai",
        title: "A matching image is painted",
        body: "An art director reads your actual copy and generates an on-brand picture that reflects the message. Pick a style, or restyle it — the subject stays consistent.",
      },
      {
        type: "user",
        title: "Improve & enforce the voice",
        body: "Send the copy to the improver to make it shorter, punchier, more formal, SEO-friendly, or re-aimed at a new audience — and see exactly what changed. Any banned words can be rewritten out in one click.",
      },
      {
        type: "data",
        title: "Everything is saved to History",
        body: "Each piece lands in your history — revisit, copy, or delete it. Create an account and your work follows you across devices; anything you made anonymously moves with you.",
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
      "The real request pipeline behind a single generation — every hop, including content moderation and refusal handling, and how each failure becomes a clean, typed response. This is the /api/generate path; the other endpoints share its shape (below).",
    nodes: [
      {
        type: "user",
        title: "Browser → POST /api/generate",
        body: "A client component sends topic + tone + audience + format. No LLM or image keys ever reach the browser — it only ever talks to /api/*. The button disables itself and a synchronous in-flight guard (useInFlight) drops any extra clicks, so one tap is exactly one request.",
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
        body: "A sliding-window check, keyed by the owner id (Upstash when configured, in-memory fallback otherwise). This caps how many requests fit in a window.",
        onError: "Over the limit → 429 RATE_LIMITED with a retry-after header. The stream never starts.",
      },
      {
        type: "system",
        title: "Concurrency lock · one AI call per session",
        body: "Where the rate limit caps requests over time, this caps them at one instant: the session takes a single in-flight slot (Redis SET NX with a TTL, in-memory fallback) before the model is called, and frees it when the stream ends — success or error. It stops a burst of simultaneous requests from one source (the rapid-click / scripted-hammer abuse case), each of which is a real billable call.",
        onError: "A request from this session is already running → 429 CONCURRENT_REQUEST; the second call is refused, never fanned out into another paid model call.",
      },
      {
        type: "system",
        title: "Validate input · zod",
        body: "The body is parsed at the boundary against a strict schema (enums for format/tone, length caps).",
        onError: "Invalid → 400 VALIDATION_ERROR in the single envelope { error: { code, message, requestId, details } }.",
      },
      {
        type: "system",
        title: "Content moderation · screenContent()",
        body: "A high-precision pre-filter screens topic + audience for harmful intent (weapons, violence, hate, CSAM, self-harm, drug-making) — before a single token is spent. Tuned so marketing metaphor never trips it.",
        onError: "Harmful request → 422 CONTENT_BLOCKED with a clear reason. No AI call is made.",
      },
      {
        type: "ai",
        title: "Claude streams the copy",
        body: "getStreamConfig() picks the per-format prompt strategy, folds in the brand voice, and appends a safety policy; anthropic().messages.stream() emits tokens as text/plain.",
        onError: "SDK / network / overload → describeAiError() maps it to a typed 502/503 with a plain-language, retryable-or-not message.",
      },
      {
        type: "system",
        title: "Refusal guard · parseRefusal()",
        body: "The opening is buffered, not streamed, until we can tell real copy from a decline. If Claude refuses — a ⟦REFUSED⟧ sentinel or an English “I can't help…” — it's caught here.",
        onError: "Model refusal → 422 CONTENT_BLOCKED carrying Claude's reason. The refusal is never streamed to the user or saved as content.",
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

// The rest of the system — every write endpoint reuses the same pipeline shape
// (session → rate limit → zod → [moderation] → AI → typed error envelope).
type Sibling = { endpoint: string; what: string; guard: string };
const SIBLINGS: Sibling[] = [
  {
    endpoint: "POST /api/improve",
    what: "Rewrites text toward a goal (shorter / persuasive / formal / SEO / re-audience) and returns a “what changed”.",
    guard: "Same moderation + refusal handling + one-in-flight-call lock; degrades gracefully if the DB write fails.",
  },
  {
    endpoint: "POST /api/images",
    what: "Turns the finished copy into one concrete scene, renders it (OpenAI, with a model-fallback chain), and re-hosts it on Vercel Blob.",
    guard: "Ownership-scoped where { id, sessionId }; the concurrency lock spans the art-director + render; scene cached; private-store proxy.",
  },
  {
    endpoint: "POST /api/enforce-voice",
    what: "Hard-removes a brand's “avoid” words from a piece and reports any that survive.",
    guard: "Rewrites in place, ownership-scoped, one-in-flight-call lock; honest about words it couldn't remove.",
  },
  {
    endpoint: "GET·POST·PUT·DELETE /api/brand-voice",
    what: "CRUD for multiple brand voices, stored server-side as the source of truth.",
    guard: "Every read/write scoped to the owner id; capped per session.",
  },
  {
    endpoint: "/api/auth/*",
    what: "Email + password accounts (scrypt, 7-day HMAC token) with anonymous-data migration on signup/login.",
    guard: "IP-rate-limited, no user-enumeration, disposable-email blocking, fail-closed signing.",
  },
  {
    endpoint: "/api/admin/*",
    what: "An env-gated operator dashboard: traffic, usage-by-type, and user management with cascading delete.",
    guard: "Constant-time credential check, HMAC admin cookie, server-guarded pages.",
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
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
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
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--body)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {f.tab}
              </button>
            );
          })}
        </div>
        <p className="max-w-xl text-center text-sm text-[var(--body)]">
          <span className="font-semibold text-[var(--ink)]">{flow.audience}.</span>{" "}
          {flow.blurb}
        </p>
      </div>

      {/* progress + controls */}
      <div className="mx-auto mt-6 flex max-w-lg items-center justify-between gap-3">
        <span className="font-mono text-xs text-[var(--muted)]">
          Step {Math.min(revealed, total)} / {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRevealed(total)}
            disabled={complete}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:opacity-40"
          >
            Reveal all
          </button>
          <button
            onClick={() => setRevealed(1)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
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
                  className="animate-grow-down my-1 h-6 w-px bg-[var(--accent-border)]"
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
                      <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted-2)]">
                        {String(i + 1).padStart(2, "0")} · {t.label}
                      </span>
                    </div>
                    <h3 className="text-[0.95rem] font-bold leading-tight text-[var(--ink)]">
                      {n.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--body)]">
                  {n.body}
                </p>

                {/* error branch (technical flow) */}
                {n.onError && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] px-3 py-2">
                    <span className="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[var(--rust)]">
                      on error
                    </span>
                    <span className="text-xs leading-relaxed text-[var(--rust)]">
                      {n.onError}
                    </span>
                  </div>
                )}

                {/* click affordance on the frontier node */}
                {clickable && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-black/5 pt-2.5 text-xs font-semibold text-[var(--accent-strong)]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
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
        <div className="animate-fade-up mx-auto mt-4 max-w-lg rounded-xl border border-[var(--accent-border)] bg-[var(--accent-tint)] px-4 py-3 text-center">
          <p className="text-sm font-semibold text-[var(--accent-strong)]">
            That&apos;s the whole {flowKey === "simple" ? "journey" : "pipeline"}.
          </p>
          <p className="mt-1 text-xs text-[var(--accent-strong)]">
            {flowKey === "simple"
              ? "Switch to “Under the hood” to see the engineering behind it."
              : "Every failure mode above returns the one typed error envelope — nothing 500s silently."}
          </p>
        </div>
      )}

      {/* the rest of the system — only on the technical view */}
      {flowKey === "technical" && (
        <div className="mx-auto mt-10 max-w-lg">
          <h3 className="text-center font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
            The same pipeline backs every endpoint
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-center text-xs text-[var(--muted)]">
            session → rate limit → zod → (moderation) → AI → one typed error
            envelope. The improver, images, brand voices, auth, and admin all reuse
            this shape.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SIBLINGS.map((s) => (
              <div
                key={s.endpoint}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
              >
                <code className="font-mono text-[0.72rem] font-semibold text-[var(--accent-strong)]">
                  {s.endpoint}
                </code>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--body)]">
                  {s.what}
                </p>
                <p className="mt-1.5 flex gap-1.5 text-[0.7rem] leading-relaxed text-[var(--muted-2)]">
                  <span className="shrink-0 font-mono font-semibold uppercase tracking-[0.05em] text-[var(--slate)]">
                    guard
                  </span>
                  {s.guard}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
