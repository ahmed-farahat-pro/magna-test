import Link from "next/link";
import ClaudeCode from "@/components/ClaudeCode";

export const metadata = {
  title: "Built with Claude Code — Nova",
  description:
    "The real AI-native development workflow behind Nova: architecture planning, debugging sessions, refactoring, prompt-driven code generation, and a multi-agent review that graded the build.",
};

const REPO = "https://github.com/ahmed-farahat-pro/magna-test";

export default function ClaudeCodePage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        {/* hero */}
        <div className="animate-fade-up text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            Claude Work
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Built end-to-end with{" "}
            <span className="text-gradient animate-grad">Claude Code</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[var(--body)]">
            Claude Code was the primary development tool for the whole build — not
            just writing code, but planning the architecture, running real
            debugging sessions, refactoring toward single sources of truth, and
            reviewing itself with a multi-agent panel. Here&apos;s the receipts.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
            >
              View the repo ↗
            </a>
            <Link
              href="/workflow"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              See how the app works →
            </Link>
          </div>
        </div>

        <ClaudeCode />

        <div className="mt-16 flex justify-center">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
          >
            Try what it built →
          </Link>
        </div>
      </div>
    </main>
  );
}
