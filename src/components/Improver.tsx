"use client";

import { useState, type FormEvent } from "react";

const GOALS = [
  { value: "shorter", label: "Shorter" },
  { value: "more_persuasive", label: "More persuasive" },
  { value: "more_formal", label: "More formal" },
  { value: "seo_optimized", label: "SEO-optimized" },
  { value: "rewrite_for_audience", label: "New audience" },
] as const;

type Goal = (typeof GOALS)[number]["value"];
type Result = { improved: string; changeSummary: string; original: string };

export default function Improver() {
  const [text, setText] = useState("");
  const [goal, setGoal] = useState<Goal>("more_persuasive");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    text.trim() &&
    !loading &&
    (goal !== "rewrite_for_audience" || audience.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.improved);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
    </div>
  );
}
