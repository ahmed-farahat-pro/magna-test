"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { exportPdf, exportDoc } from "@/lib/export";

const PAGE_SIZE = 12;

const CT_LABEL: Record<string, string> = {
  BLOG_POST: "Blog post",
  LINKEDIN_POST: "LinkedIn",
  AD_COPY: "Ad copy",
  EMAIL: "Email",
};
const GOAL_LABEL: Record<string, string> = {
  SHORTER: "Shorter",
  MORE_PERSUASIVE: "More persuasive",
  MORE_FORMAL: "More formal",
  SEO_OPTIMIZED: "SEO",
  REWRITE_FOR_AUDIENCE: "Re-audience",
};

type Item = {
  id: string;
  kind: "GENERATE" | "IMPROVE";
  contentType: string | null;
  topic: string | null;
  improveGoal: string | null;
  outputText: string;
  explanation: string | null;
  imageUrl: string | null;
  imageStyle: string | null;
  createdAt: string;
};

function label(item: Item): string {
  if (item.kind === "IMPROVE")
    return `Improved · ${GOAL_LABEL[item.improveGoal ?? ""] ?? "edit"}`;
  return CT_LABEL[item.contentType ?? ""] ?? "Content";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function triggerDownload(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?page=${p}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not load history.");
        return;
      }
      setItems(json.items);
      setTotal(json.total);
      setPage(json.page);
    } catch {
      setError("Network error while loading history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    // optimistic
    setItems((xs) => xs.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setSelected((s) => (s?.id === id ? null : s));
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
    } catch {
      // if it fails, reload to reconcile
      load(page);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="font-mono text-xs text-[#5c665e]">
          {loading ? "loading…" : `${total} item${total === 1 ? "" : "s"}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[#e7c9c0] bg-[#f7e8e0] p-4" role="alert">
          <p className="text-sm text-[#8a3315]">{error}</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border border-[#d9dfd8] bg-[#f4f7f3]"
            />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#d9dfd8] bg-white py-20 text-center">
          <p className="text-sm font-medium text-[#3c4a54]">No content yet</p>
          <p className="max-w-xs text-xs text-[#8a938b]">
            Everything you generate or improve is saved here per session.
          </p>
          <Link
            href="/"
            className="mt-1 rounded-lg bg-[#0e7a63] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
          >
            Create your first piece →
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#d9dfd8] bg-white"
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.topic ?? "Generated image"}
                    className="h-36 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[0.68rem] font-semibold ${
                        item.kind === "IMPROVE"
                          ? "bg-[#f7e8e0] text-[#8a3315]"
                          : "bg-[#e6f2ec] text-[#0a5346]"
                      }`}
                    >
                      {label(item)}
                    </span>
                    <span className="font-mono text-[0.68rem] text-[#9aa39b]">
                      {fmtDate(item.createdAt)}
                    </span>
                  </div>
                  {item.topic && (
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#141a16]">
                      {item.topic}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#5c665e]">
                    {item.outputText}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                    <button onClick={() => setSelected(item)} className={ghost}>
                      View
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.outputText)}
                      className={ghost}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() =>
                        triggerDownload(
                          item.outputText,
                          `${item.kind.toLowerCase()}-${item.id.slice(0, 8)}.txt`,
                        )
                      }
                      className={ghost}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="ml-auto rounded-md border border-[#e7c9c0] bg-white px-2.5 py-1 text-xs font-medium text-[#a62a2a] transition-colors hover:bg-[#f7e8e0]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className={pager}
              >
                ‹ Prev
              </button>
              <span className="font-mono text-xs text-[#5c665e]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className={pager}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#d9dfd8] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e7ebe6] px-5 py-3">
              <span className="font-mono text-xs font-semibold text-[#3c4a54]">
                {label(selected)} · {fmtDate(selected.createdAt)}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md px-2 py-1 text-sm text-[#5c665e] hover:bg-[#f4f7f3]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {selected.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.imageUrl}
                  alt={selected.topic ?? "Generated image"}
                  className="mb-4 w-full rounded-lg border border-[#d9dfd8]"
                />
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#1c241e]">
                {selected.outputText}
              </div>
              {selected.explanation && (
                <div className="mt-4 rounded-lg bg-[#f4f7f3] p-3">
                  <div className="mb-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                    What changed
                  </div>
                  <p className="text-sm text-[#3c4a54]">{selected.explanation}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-[#e7ebe6] px-5 py-3">
              <button
                onClick={() => navigator.clipboard.writeText(selected.outputText)}
                className={ghost}
              >
                Copy
              </button>
              <button
                onClick={() =>
                  triggerDownload(
                    selected.outputText,
                    `${selected.kind.toLowerCase()}-${selected.id.slice(0, 8)}.txt`,
                  )
                }
                className={ghost}
              >
                .txt
              </button>
              <button
                onClick={() =>
                  exportPdf(
                    selected.outputText,
                    `${selected.kind.toLowerCase()}-${selected.id.slice(0, 8)}`,
                  )
                }
                className={ghost}
              >
                PDF
              </button>
              <button
                onClick={() =>
                  exportDoc(
                    selected.outputText,
                    `${selected.kind.toLowerCase()}-${selected.id.slice(0, 8)}`,
                  )
                }
                className={ghost}
              >
                Word
              </button>
              <button
                onClick={() => remove(selected.id)}
                className="ml-auto rounded-md border border-[#e7c9c0] bg-white px-2.5 py-1 text-xs font-medium text-[#a62a2a] transition-colors hover:bg-[#f7e8e0]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ghost =
  "rounded-md border border-[#d9dfd8] bg-white px-2.5 py-1 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]";
const pager =
  "rounded-md border border-[#d9dfd8] bg-white px-3 py-1.5 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] disabled:cursor-not-allowed disabled:opacity-40";
