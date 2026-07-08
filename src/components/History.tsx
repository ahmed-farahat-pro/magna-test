"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { exportPdf, exportDocx } from "@/lib/export";

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

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="block w-full whitespace-nowrap px-3.5 py-2 text-left text-xs font-medium text-[#3c4a54] transition-colors hover:bg-[#f0f5f1] hover:text-[#0a5346]"
    >
      {children}
    </button>
  );
}

// Download picker: Text / Word / PDF, plus "with photo" variants when the entry
// has a generated image. Rendered through a portal with fixed positioning so the
// menu is never clipped by the card's overflow-hidden or hover transform.
function DownloadMenu({ item, up = false }: { item: Item; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const base = `${item.kind.toLowerCase()}-${item.id.slice(0, 8)}`;
  const hasImg = Boolean(item.imageUrl);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      // Consume Escape here so the enclosing modal's Escape handler doesn't also
      // fire and close the whole modal — the open menu owns Escape first.
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: up ? r.top : r.bottom,
        right: window.innerWidth - r.right,
      });
    }
    setOpen((o) => !o);
  }

  async function run(fn: () => void | Promise<void>) {
    setOpen(false);
    setBusy(true);
    try {
      await fn();
    } catch {
      /* export is best-effort */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={ghost}
      >
        {busy ? "Preparing…" : "Download ▾"}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id="dl-menu-pop"
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: up ? undefined : pos.top + 6,
              bottom: up ? window.innerHeight - pos.top + 6 : undefined,
              right: pos.right,
              zIndex: 9999,
            }}
            className="w-44 overflow-hidden rounded-lg border border-[#d9dfd8] bg-white py-1 shadow-xl"
          >
            <MenuItem
              onClick={() => run(() => triggerDownload(item.outputText, `${base}.txt`))}
            >
              Text only (.txt)
            </MenuItem>
            <MenuItem onClick={() => run(() => exportDocx(item.outputText, base))}>
              Word (.docx)
            </MenuItem>
            <MenuItem onClick={() => run(() => exportPdf(item.outputText, base))}>
              PDF (.pdf)
            </MenuItem>
            {hasImg && (
              <>
                <div className="my-1 border-t border-[#e7ebe6]" />
                <div className="px-3.5 pb-1 pt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[#5f6960]">
                  With photo
                </div>
                <MenuItem
                  onClick={() =>
                    run(() => exportDocx(item.outputText, `${base}-with-image`, item.imageUrl))
                  }
                >
                  Word + photo
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    run(() => exportPdf(item.outputText, `${base}-with-image`, item.imageUrl))
                  }
                >
                  PDF + photo
                </MenuItem>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function History() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

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
      // If a download menu is open, let it own Escape (close the menu, not the modal).
      if (e.key === "Escape" && !document.getElementById("dl-menu-pop")) {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (selected) {
      // Remember what opened the dialog, then move focus into it.
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else {
      // Restore focus to the trigger when the dialog closes.
      lastFocusedRef.current?.focus?.();
    }
  }, [selected]);

  // Keep Tab focus inside the open dialog (simple focus trap).
  function trapFocus(e: ReactKeyboardEvent) {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    const focusable = Array.from(nodes).filter((n) => !n.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function remove(id: string) {
    // Two-step, in-UI confirm (no native window.confirm): first click arms it,
    // second click within a few seconds performs the delete.
    if (confirmId !== id) {
      setConfirmId(id);
      window.setTimeout(
        () => setConfirmId((c) => (c === id ? null : c)),
        3500,
      );
      return;
    }
    setConfirmId(null);
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
          <p className="max-w-xs text-xs text-[#5f6960]">
            Everything you generate or improve is saved here per session.
          </p>
          <Link
            href="/create"
            className="mt-1 rounded-lg bg-[#0e7a63] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
          >
            Create your first piece →
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <article
                key={item.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-up flex flex-col overflow-hidden rounded-xl border border-[#d9dfd8] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {item.imageUrl && (
                  <div className="relative h-36 w-full">
                    <Image
                      src={item.imageUrl}
                      alt={item.topic ?? "Generated image"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
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
                    <span className="font-mono text-[0.68rem] text-[#5f6960]">
                      {fmtDate(item.createdAt)}
                    </span>
                  </div>
                  {item.topic && (
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#141a16]">
                      {item.topic}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#5c665e]">
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
                    <DownloadMenu item={item} />
                    <button
                      onClick={() => remove(item.id)}
                      className={`ml-auto rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        confirmId === item.id
                          ? "border-[#a62a2a] bg-[#a62a2a] text-white"
                          : "border-[#e7c9c0] bg-white text-[#a62a2a] hover:bg-[#f7e8e0]"
                      }`}
                    >
                      {confirmId === item.id ? "Confirm delete" : "Delete"}
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
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hist-modal-title"
            className="animate-scale-in flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#d9dfd8] bg-white shadow-xl outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapFocus}
          >
            <div className="flex items-center justify-between border-b border-[#e7ebe6] px-5 py-3">
              <span
                id="hist-modal-title"
                className="font-mono text-xs font-semibold text-[#3c4a54]"
              >
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
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1c241e]">
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
              <DownloadMenu item={selected} up />
              <button
                onClick={() => remove(selected.id)}
                className={`ml-auto rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  confirmId === selected.id
                    ? "border-[#a62a2a] bg-[#a62a2a] text-white"
                    : "border-[#e7c9c0] bg-white text-[#a62a2a] hover:bg-[#f7e8e0]"
                }`}
              >
                {confirmId === selected.id ? "Confirm delete" : "Delete"}
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
