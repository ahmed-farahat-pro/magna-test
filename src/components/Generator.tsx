"use client";

import { useState, type FormEvent } from "react";

const CONTENT_TYPES = [
  { value: "blog_post", label: "Blog post" },
  { value: "linkedin_post", label: "LinkedIn" },
  { value: "ad_copy", label: "Ad copy" },
  { value: "email", label: "Email" },
] as const;

const TONES = [
  "professional",
  "casual",
  "witty",
  "authoritative",
  "friendly",
  "bold",
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.value, t.label]),
);

type Result = { outputText: string; contentType: string; saved: boolean };

export default function Generator() {
  const [contentType, setContentType] =
    useState<(typeof CONTENT_TYPES)[number]["value"]>("blog_post");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("professional");
  const [audience, setAudience] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = topic.trim() && audience.trim() && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, audience, contentType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Generation failed. Please try again.");
        return;
      }
      setResult({
        outputText: json.outputText,
        contentType: json.contentType,
        saved: json.saved,
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.contentType}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls =
    "w-full rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2.5 text-sm text-[#141a16] outline-none transition-colors placeholder:text-[#9aa39b] focus:border-[#0e7a63] focus:ring-2 focus:ring-[#0e7a63]/15";
  const labelCls =
    "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#5c665e]";

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* ── Form ── */}
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <span className={labelCls}>Content type</span>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((t) => {
              const active = t.value === contentType;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setContentType(t.value)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#0e7a63] bg-[#e6f2ec] text-[#0a5346]"
                      : "border-[#d9dfd8] bg-white text-[#3c4a54] hover:border-[#b9c6bd]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="topic">
            Topic
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="e.g. Why small teams should automate their invoicing"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tone">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}
            className={`${inputCls} capitalize`}
          >
            {TONES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="audience">
            Target audience
          </label>
          <input
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            maxLength={120}
            placeholder="e.g. B2B SaaS founders"
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0e7a63] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Generating…" : "✨ Generate content"}
        </button>
      </form>

      {/* ── Result ── */}
      <section className="min-h-[420px] rounded-xl border border-[#d9dfd8] bg-white">
        {!result && !loading && !error && (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-[#3c4a54]">
              Your generated content will appear here
            </p>
            <p className="max-w-xs text-xs text-[#8a938b]">
              Pick a format, describe the topic, tone, and audience, then hit
              generate.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3 p-6" aria-busy="true">
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#e7ebe6]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#eff2ee]" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-[#eff2ee]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[#eff2ee]" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#eff2ee]" />
            <p className="mt-2 font-mono text-xs text-[#8a938b]">
              Writing with Claude…
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="m-6 rounded-lg border border-[#e7c9c0] bg-[#f7e8e0] p-4" role="alert">
            <p className="text-sm font-semibold text-[#8a3315]">
              Couldn&apos;t generate content
            </p>
            <p className="mt-1 text-sm text-[#8a3315]/90">{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e7ebe6] px-5 py-3">
              <span className="rounded-md bg-[#e6f2ec] px-2.5 py-1 font-mono text-xs font-semibold text-[#0a5346]">
                {TYPE_LABEL[result.contentType] ?? result.contentType}
              </span>
              <span className="font-mono text-xs text-[#8a938b]">
                {result.saved ? "✓ saved to history" : "not saved (DB offline)"}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={copy}
                  className="rounded-md border border-[#d9dfd8] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
                <button
                  onClick={download}
                  className="rounded-md border border-[#d9dfd8] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
                >
                  Download
                </button>
              </div>
            </div>
            <div
              aria-live="polite"
              className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-[#1c241e]"
            >
              {result.outputText}
            </div>
            <div className="mt-auto border-t border-[#e7ebe6] px-5 py-3">
              <button
                disabled
                title="Coming in the next build"
                className="cursor-not-allowed rounded-md border border-dashed border-[#d9c3b8] bg-[#f7e8e0]/50 px-3 py-1.5 text-xs font-medium text-[#8a3315]/70"
              >
                🖼 Generate matching image — next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
