"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS: { href: string; label: string; optional?: boolean }[] = [
  { href: "/create", label: "Generate" },
  { href: "/improve", label: "Improve" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/workflow", label: "Workflow" },
  { href: "/fixes", label: "Fixes" },
  { href: "/architecture", label: "Architecture", optional: true },
];

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="animate-mark bg-grad animate-grad glow relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z"
            fill="#fff"
          />
        </svg>
      </span>
      <span className="text-gradient animate-grad text-[1.15rem] font-extrabold tracking-tight">
        Nova
      </span>
    </Link>
  );
}

export default function TopNav() {
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshAuth = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setEmail(j?.user?.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    refreshAuth();
    const onChange = () => refreshAuth();
    window.addEventListener("auth-changed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("auth-changed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [path, refreshAuth]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (path.startsWith("/admin")) return;
    fetch("/api/track/visit", { method: "POST" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setEmail(null);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/";
  }

  if (path.startsWith("/admin")) return null;

  const authControl = ready ? (
    email ? (
      <span className="flex shrink-0 items-center gap-2">
        <span
          className="hidden max-w-[150px] truncate font-mono text-xs text-[var(--muted)] sm:inline"
          title={email}
        >
          {email}
        </span>
        <button
          onClick={signOut}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
        >
          Sign out
        </button>
      </span>
    ) : (
      <Link
        href="/account"
        className="bg-grad animate-grad glow shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Sign in
      </Link>
    )
  ) : null;

  const navLink = (l: (typeof LINKS)[number], onClick?: () => void) => {
    const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
            : "text-[var(--body)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        }`}
      >
        {l.label}
        {l.optional && (
          <span className="rounded border border-[var(--rust-border)] bg-[var(--rust-tint)] px-1 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-[var(--rust)]">
            opt
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="glass sticky top-0 z-30 border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Wordmark />

        {/* desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => navLink(l))}
          <span className="mx-1 h-5 w-px bg-[var(--border)]" />
          <ThemeToggle />
          {authControl}
        </nav>

        {/* mobile controls */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          {authControl}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="animate-fade-in border-t border-[var(--border-2)] bg-[var(--surface-2)] lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {LINKS.map((l) => navLink(l, () => setMenuOpen(false)))}
            <a
              href="/api/health"
              className="mt-1 px-3 py-1.5 font-mono text-xs text-[var(--muted)]"
            >
              status ↗
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
