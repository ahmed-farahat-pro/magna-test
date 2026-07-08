"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; optional?: boolean }[] = [
  { href: "/create", label: "Generate" },
  { href: "/improve", label: "Improve" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/architecture", label: "Architecture", optional: true },
];

export default function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-[#d9dfd8] bg-[#eff2ee]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#0e7a63]" />
          <span className="whitespace-nowrap font-semibold tracking-tight text-[#141a16]">
            AI Content Marketing Suite
          </span>
        </Link>
        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                  active
                    ? "bg-[#e6f2ec] text-[#0a5346]"
                    : "text-[#3c4a54] hover:bg-white"
                }`}
              >
                {l.label}
                {l.optional && (
                  <span className="ml-1 rounded border border-[#d9c3b8] bg-[#f7e8e0] px-1 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.04em] text-[#8a3315]">
                    optional
                  </span>
                )}
              </Link>
            );
          })}
          <a
            href="/api/health"
            className="ml-2 hidden shrink-0 font-mono text-xs text-[#5f6960] transition-colors hover:text-[#0a5346] sm:inline"
          >
            status
          </a>
        </nav>
      </div>
    </header>
  );
}
