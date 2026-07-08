"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "@/lib/toast";
import { fmtUsd } from "@/lib/pricing";
import { useInFlight } from "@/lib/useInFlight";

const GOALS = [
  { value: "shorter", label: "Shorter" },
  { value: "more_persuasive", label: "More persuasive" },
  { value: "more_formal", label: "More formal" },
  { value: "seo_optimized", label: "SEO-optimized" },
  { value: "rewrite_for_audience", label: "New audience" },
] as const;

const GOAL_LABEL: Record<string, string> = {
  SHORTER: "Shorter",
  MORE_PERSUASIVE: "More persuasive",
  MORE_FORMAL: "More formal",
  SEO_OPTIMIZED: "SEO-optimized",
  REWRITE_FOR_AUDIENCE: "New audience",
};

type Goal = (typeof GOALS)[number]["value"];
type Result = { improved: string; changeSummary: string; original: string };
type Recent = {
  id: string;
  improveGoal: string | null;
  sourceText: string | null;
  outputText: string;
  explanation: string | null;
  costUsd: number | null;
  createdAt: string;
};

export default function Improver() {
  const [text, setText] = useState("");
  const [goal, setGoal] = useState<Goal>("more_persuasive");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const guard = useInFlight();

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/history?kind=IMPROVE&pageSize=12", {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setRecent(json.items ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const canSubmit =
    text.trim() &&
    !loading &&
    (goal !== "rewrite_for_audience" || audience.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await guard(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          goal,
          targetAudience:
            goal === "rewrite_for_audience" ? audience : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not improve the text.");
        return;
      }
      setResult({
        improved: json.improved,
        changeSummary: json.changeSummary,
        original: text,
      });
      loadRecent(); // keep the in-context history current
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
    });
  }

  // Open a past improvement back into the before/after view.
  function viewRecent(r: Recent) {
    setResult({
      improved: r.outputText,
      changeSummary: r.explanation ?? "",
      original: r.sourceText ?? "",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Load a past improvement's ORIGINAL text back into the editor to re-improve.
  function reuseRecent(r: Recent) {
    if (!r.sourceText) return;
    setText(r.sourceText);
    const g = (r.improveGoal ?? "").toLowerCase();
    if (g) setGoal(g as Goal);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Loaded back into the editor");
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.improved);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — clipboard unavailable.");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";
  const labelCls =
    "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-2)]";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label className={labelCls} htmlFor="source">
            Your text
          </label>
          <textarea
            id="source"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            maxLength={12000}
            placeholder="Paste the marketing copy you want to improve…"
            className={`${inputCls} resize-y`}
          />
          <p className="mt-1 text-right font-mono text-xs text-[var(--muted)]">
            {text.length} / 12,000
          </p>
        </div>

        <div>
          <span className={labelCls}>Improvement goal</span>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const active = g.value === goal;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--body)] hover:border-[var(--accent-border)]"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {goal === "rewrite_for_audience" && (
          <div>
            <label className={labelCls} htmlFor="audience">
              New target audience
            </label>
            <input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              maxLength={120}
              placeholder="e.g. enterprise procurement leaders"
              className={inputCls}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Improving…" : "Improve content"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] p-4" role="alert">
          <p className="text-sm text-[var(--rust)]">{error}</p>
        </div>
      )}

      {result && (
        <div className="animate-fade-up mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Before
              </div>
              <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--muted-2)]">
                {result.original}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-strong)]">
                  After
                </span>
                <button
                  onClick={copy}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink-2)]">
                {result.improved}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-2)]">
              What changed
            </div>
            <p className="text-sm leading-relaxed text-[var(--body)]">
              {result.changeSummary}
            </p>
          </div>
        </div>
      )}

      {/* ── In-context history: your recent improvements (session-scoped) ── */}
      {recent.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--ink)]">
              Your recent improvements
            </h2>
            <a
              href="/history"
              className="font-mono text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent-strong)]"
            >
              All history →
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            {recent.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--rust-tint)] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-[var(--rust)]">
                    {GOAL_LABEL[r.improveGoal ?? ""] ?? "Improved"}
                  </span>
                  <span className="font-mono text-[0.66rem] text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  {r.costUsd != null && (
                    <span className="font-mono text-[0.66rem] text-[var(--accent-strong)]">
                      {fmtUsd(r.costUsd)}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--body)]">
                  {r.outputText}
                </p>
                {r.explanation && (
                  <p className="mt-1.5 line-clamp-1 text-xs text-[var(--muted)]">
                    <span className="font-semibold">Changed: </span>
                    {r.explanation}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => viewRecent(r)} className={recentBtn}>
                    View
                  </button>
                  {r.sourceText && (
                    <button onClick={() => reuseRecent(r)} className={recentBtn}>
                      Reuse original
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(r.outputText)
                        .then(() => toast.success("Copied to clipboard"))
                        .catch(() => toast.error("Couldn't copy."));
                    }}
                    className={recentBtn}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const recentBtn =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]";
