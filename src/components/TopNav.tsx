"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; optional?: boolean }[] = [
  { href: "/create", label: "Generate" },
  { href: "/improve", label: "Improve" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/workflow", label: "Workflow" },
  { href: "/fixes", label: "Fixes" },
  { href: "/architecture", label: "Architecture", optional: true },
];

export default function TopNav() {
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Always bypass the HTTP cache — a stale pre-login {user:null} is exactly the
  // bug that left the header showing "Sign in" after signing in.
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

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  // Record a unique anonymous visitor once per browser (skips the admin area).
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    fetch("/api/track/visit", { method: "POST" }).catch(() => {});
    // Fire once on first mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setEmail(null);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/";
  }

  // The admin area is a separate surface — don't show the consumer nav there.
  if (path.startsWith("/admin")) return null;

  const authControl = (
    <>
      {ready &&
        (email ? (
          <span className="flex shrink-0 items-center gap-2">
            <span
              className="hidden max-w-[160px] truncate font-mono text-xs text-[#5f6960] sm:inline"
              title={email}
            >
              {email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md border border-[#d9dfd8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
            >
              Sign out
            </button>
          </span>
        ) : (
          <Link
            href="/account"
            className="shrink-0 rounded-md bg-[#0e7a63] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
          >
            Sign in
          </Link>
        ))}
    </>
  );

  const navLink = (l: (typeof LINKS)[number], onClick?: () => void) => {
    const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          active ? "bg-[#e6f2ec] text-[#0a5346]" : "text-[#3c4a54] hover:bg-white"
        }`}
      >
        {l.label}
        {l.optional && (
          <span className="rounded border border-[#d9c3b8] bg-[#f7e8e0] px-1 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-[#8a3315]">
            optional
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9dfd8] bg-[#eff2ee]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6 sm:py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#0e7a63]" />
          <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-[#141a16] sm:text-base">
            AI Content Marketing Suite
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => navLink(l))}
          <a
            href="/api/health"
            className="ml-1 shrink-0 font-mono text-xs text-[#5f6960] transition-colors hover:text-[#0a5346]"
          >
            status
          </a>
          <span className="ml-1">{authControl}</span>
        </nav>

        {/* mobile: auth always visible + hamburger */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {authControl}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d9dfd8] bg-white text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
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

      {/* mobile dropdown panel */}
      {menuOpen && (
        <nav className="animate-fade-in border-t border-[#e7ebe6] bg-[#f4f7f3] lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {LINKS.map((l) => navLink(l, () => setMenuOpen(false)))}
            <a
              href="/api/health"
              className="mt-1 px-3 py-1.5 font-mono text-xs text-[#5f6960]"
            >
              status ↗
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
