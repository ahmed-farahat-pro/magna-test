"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Generate" },
  { href: "/improve", label: "Improve" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export default function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-[#d9dfd8] bg-[#eff2ee]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0e7a63]" />
          <span className="font-semibold tracking-tight text-[#141a16]">
            AI Content Marketing Suite
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#e6f2ec] text-[#0a5346]"
                    : "text-[#3c4a54] hover:bg-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <a
            href="/api/health"
            className="ml-2 font-mono text-xs text-[#8a938b] transition-colors hover:text-[#0a5346]"
          >
            status
          </a>
        </nav>
      </div>
    </header>
  );
}
