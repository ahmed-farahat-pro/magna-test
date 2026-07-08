"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  listVoices,
  getSelectedVoiceId,
  setSelectedVoiceId,
  type BrandVoice,
} from "@/lib/brandVoice";
import { exportPdf, exportDocx } from "@/lib/export";

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

const IMAGE_STYLES = [
  { value: "photographic", label: "Photographic" },
  { value: "3d_render", label: "3D render" },
  { value: "flat_illustration", label: "Flat" },
  { value: "minimalist", label: "Minimal" },
  { value: "bold_gradient", label: "Gradient" },
  { value: "editorial", label: "Editorial" },
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.value, t.label]),
);

type ImageStyle = (typeof IMAGE_STYLES)[number]["value"];

type Result = {
  id: string | null;
  outputText: string;
  contentType: string;
  saved: boolean;
  topic: string;
  tone: string;
  avoided?: string[]; // brand "avoid" words that slipped into the output
};

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
  const [enforcing, setEnforcing] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  useEffect(() => {
    listVoices().then((vs) => {
      setVoices(vs);
      const sel = getSelectedVoiceId();
      if (sel && vs.some((v) => v.id === sel)) setVoiceId(sel);
    });
  }, []);

  const selectedVoice = voices.find((v) => v.id === voiceId) ?? null;

  // image state
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgStyle, setImgStyle] = useState<ImageStyle>("photographic");
  const [imgPrompt, setImgPrompt] = useState<string | null>(null);
  // The derived scene, cached so re-styling keeps the SAME subject and skips a
  // fresh art-director call.
  const [imgScene, setImgScene] = useState<string | null>(null);

  const canSubmit = topic.trim() && audience.trim() && !loading;

  function resetImage() {
    setImgUrl(null);
    setImgError(null);
    setImgPrompt(null);
    setImgScene(null);
    setImgLoading(false);
    setImgStyle("photographic");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setStreaming(true);
    setStreamText("");
    setError(null);
    setResult(null);
    resetImage();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone,
          audience,
          contentType,
          brandVoice: selectedVoice ?? undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        setError(j?.error?.message ?? "Generation failed. Please try again.");
        return;
      }

      // Stream tokens live; the final SEP-delimited chunk carries JSON metadata.
      const SEP = String.fromCharCode(30);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const sep = acc.indexOf(SEP);
        setStreamText(sep >= 0 ? acc.slice(0, sep) : acc);
      }
      acc += decoder.decode();

      const sep = acc.indexOf(SEP);
      const textPart = sep >= 0 ? acc.slice(0, sep) : acc;
      let meta: {
        id?: string | null;
        saved?: boolean;
        error?: string;
        avoided?: string[];
      } = {};
      if (sep >= 0) {
        try {
          meta = JSON.parse(acc.slice(sep + 1));
        } catch {
          /* ignore trailer parse errors */
        }
      }
      if (meta.error) {
        setError(meta.error);
        return;
      }
      setResult({
        id: meta.id ?? null,
        outputText: textPart,
        contentType,
        saved: meta.saved ?? false,
        topic,
        tone,
        avoided: meta.avoided ?? [],
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  async function generateImage(style: ImageStyle, force = false) {
    if (!result) return;
    // No-op when re-clicking the current style on an existing image (avoids a
    // wasted paid regeneration) — unless the user explicitly asks for a new
    // variation of the same style (force).
    if (!force && imgUrl && style === imgStyle && !imgLoading) return;
    setImgLoading(true);
    setImgError(null);
    setImgStyle(style);
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: result.id ?? undefined,
          topic: result.topic,
          tone: result.tone,
          contentType: result.contentType,
          content: result.outputText,
          scene: imgScene ?? undefined,
          style,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImgError(json?.error?.message ?? "Image generation failed.");
        return;
      }
      setImgUrl(json.imageUrl);
      setImgPrompt(json.prompt ?? null);
      if (json.scene) setImgScene(json.scene);
    } catch {
      setImgError("Network error while generating the image.");
    } finally {
      setImgLoading(false);
    }
  }

  async function enforceBrandVoice() {
    if (!result || !result.avoided?.length) return;
    setEnforcing(true);
    try {
      const res = await fetch("/api/enforce-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: result.id ?? undefined,
          text: result.outputText,
          avoid: result.avoided,
        }),
      });
      const json = await res.json();
      if (res.ok && json.text) {
        setResult((r) =>
          r ? { ...r, outputText: json.text, avoided: json.remaining ?? [] } : r,
        );
      }
    } catch {
      /* best-effort */
    } finally {
      setEnforcing(false);
    }
  }

  async function copyText() {
    if (!result) return;
    await navigator.clipboard.writeText(result.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadText() {
    if (!result) return;
    trigger(
      new Blob([result.outputText], { type: "text/plain" }),
      `${result.contentType}-${Date.now()}.txt`,
    );
  }

  async function downloadImage() {
    if (!imgUrl) return;
    const res = await fetch(imgUrl);
    trigger(await res.blob(), `image-${Date.now()}.png`);
  }

  function trigger(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";
  const labelCls =
    "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-2)]";
  const btnGhost =
    "rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]";

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
                      ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--body)] hover:border-[var(--accent-border)]"
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

        {voices.length > 0 ? (
          <div>
            <label className={labelCls} htmlFor="voice">
              Brand voice
            </label>
            <select
              id="voice"
              value={voiceId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setVoiceId(id);
                setSelectedVoiceId(id);
              }}
              className={inputCls}
            >
              <option value="">None</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <a
              href="/settings"
              className="mt-1 inline-block text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent-strong)]"
            >
              Manage brand voices →
            </a>
          </div>
        ) : (
          <a
            href="/settings"
            className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-center text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            + Add a brand voice in Settings
          </a>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Generating…" : "Generate content"}
        </button>
      </form>

      {/* ── Result ── */}
      <section className="min-h-[420px] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {!result && !streaming && !error && (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-[var(--body)]">
              Your generated content will appear here
            </p>
            <p className="max-w-xs text-xs text-[var(--muted)]">
              Pick a format, describe the topic, tone, and audience, then hit
              generate — then create a matching image in one click.
            </p>
          </div>
        )}

        {streaming && (
          <div
            className="animate-fade-in flex h-full flex-col p-6"
            aria-busy="true"
            aria-live="polite"
          >
            {streamText ? (
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink-2)]">
                {streamText}
                <span
                  className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-[var(--accent)] align-middle"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--border-2)]" />
                <div className="h-3 w-full animate-pulse rounded bg-[var(--bg)]" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-[var(--bg)]" />
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                  Writing with Claude…
                </p>
              </div>
            )}
          </div>
        )}

        {error && !streaming && (
          <div className="m-6 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] p-4" role="alert">
            <p className="text-sm font-semibold text-[var(--rust)]">
              Couldn&apos;t generate content
            </p>
            <p className="mt-1 text-sm text-[var(--rust)]/90">{error}</p>
          </div>
        )}

        {result && !streaming && (
          <div className="animate-fade-up flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-2)] px-5 py-3">
              <span className="rounded-md bg-[var(--accent-tint)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--accent-strong)]">
                {TYPE_LABEL[result.contentType] ?? result.contentType}
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {result.saved ? "✓ saved to history" : "not saved (DB offline)"}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button onClick={copyText} className={btnGhost}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
                <button onClick={downloadText} className={btnGhost}>
                  .txt
                </button>
                <button
                  onClick={() =>
                    exportPdf(
                      result.outputText,
                      `${result.contentType}-${Date.now()}`,
                    ).catch(() => {})
                  }
                  className={btnGhost}
                >
                  PDF
                </button>
                <button
                  onClick={() =>
                    exportDocx(
                      result.outputText,
                      `${result.contentType}-${Date.now()}`,
                    ).catch(() => {})
                  }
                  className={btnGhost}
                >
                  Word
                </button>
              </div>
            </div>

            <div
              aria-live="polite"
              className="max-h-[46vh] overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-relaxed text-[var(--ink-2)]"
            >
              {result.outputText}
            </div>

            {/* ── Brand-voice hard enforcement ── */}
            {result.avoided && result.avoided.length > 0 && (
              <div className="mx-5 mb-1 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] px-3 py-2">
                <span className="text-xs text-[var(--rust)]">
                  Uses {result.avoided.length} word
                  {result.avoided.length === 1 ? "" : "s"} your brand voice avoids:{" "}
                  <span className="font-semibold">
                    {result.avoided.join(", ")}
                  </span>
                </span>
                <button
                  onClick={enforceBrandVoice}
                  disabled={enforcing}
                  className="ml-auto rounded-md border border-[var(--rust-border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--rust)] transition-colors hover:bg-[var(--rust-tint)] disabled:opacity-50"
                >
                  {enforcing ? "Rewriting…" : "Rewrite to remove"}
                </button>
              </div>
            )}

            {/* ── Image pairing (featured) ── */}
            <div className="mt-auto border-t border-[var(--border-2)] px-5 py-4">
              {!imgUrl && !imgLoading && !imgError && (
                <button
                  onClick={() => generateImage(imgStyle)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] px-4 py-2.5 text-sm font-semibold text-[var(--rust)] transition-colors hover:bg-[var(--rust-tint)]"
                >
                  Generate matching image
                </button>
              )}

              {imgLoading && !imgUrl && (
                <div className="flex aspect-video max-w-md animate-pulse items-center justify-center rounded-lg bg-[var(--surface-2)]">
                  <span className="font-mono text-xs text-[var(--muted)]">
                    Painting your image…
                  </span>
                </div>
              )}

              {imgError && !imgLoading && (
                <div className="rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] p-3" role="alert">
                  <p className="text-sm text-[var(--rust)]">{imgError}</p>
                  <button
                    onClick={() => generateImage(imgStyle)}
                    className="mt-2 rounded-md border border-[var(--rust-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--rust)]"
                  >
                    Try again
                  </button>
                </div>
              )}

              {imgUrl && (
                <div className="flex flex-col gap-3">
                  <div className="relative max-w-md overflow-hidden rounded-lg border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={
                        imgScene
                          ? `AI image — ${imgScene.slice(0, 140)}`
                          : `AI image for “${result.topic}”`
                      }
                      className={`w-full animate-fade-in transition-opacity ${imgLoading ? "opacity-40" : "opacity-100"}`}
                    />
                    {imgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                        <span className="rounded-md bg-white/90 px-2 py-1 font-mono text-xs text-[var(--muted-2)]">
                          Regenerating…
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={labelCls + " mb-0 mr-1"}>Style</span>
                    {IMAGE_STYLES.map((s) => {
                      const active = s.value === imgStyle;
                      return (
                        <button
                          key={s.value}
                          onClick={() => generateImage(s.value)}
                          disabled={imgLoading}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            active
                              ? "border-[var(--rust-2)] bg-[var(--rust-tint)] text-[var(--rust)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--body)] hover:border-[var(--accent-border)]"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => generateImage(imgStyle, true)}
                      disabled={imgLoading}
                      title="Generate a new image in the same style"
                      className={`${btnGhost} ml-auto disabled:opacity-50`}
                    >
                      New variation
                    </button>
                    <button
                      onClick={downloadImage}
                      disabled={imgLoading}
                      className={`${btnGhost} disabled:opacity-50`}
                    >
                      Download image
                    </button>
                  </div>

                  {imgPrompt && (
                    <p className="break-words font-mono text-[0.68rem] leading-relaxed text-[var(--muted)]">
                      <span className="text-[var(--muted-2)]">auto-prompt:</span>{" "}
                      {imgPrompt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
