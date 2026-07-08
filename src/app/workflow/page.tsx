import Link from "next/link";
import WorkflowFlows from "@/components/WorkflowFlows";
import TechStack from "@/components/TechStack";

export const metadata = {
  title: "How it works — Workflow | Nova",
  description:
    "Two interactive flowcharts: a simple journey for anyone, and the full technical request pipeline with error handling. Click through each step.",
};

const LEGEND: { label: string; dot: string }[] = [
  { label: "You", dot: "bg-[var(--accent)]" },
  { label: "Server", dot: "bg-[var(--slate)]" },
  { label: "Claude / OpenAI", dot: "bg-[var(--violet)]" },
  { label: "Database / Storage", dot: "bg-[var(--amber)]" },
];

export default function WorkflowPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
        <div className="animate-fade-up text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            Workflow
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            How the app works — click through it
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[var(--body)]">
            Two flowcharts for two audiences. Start with the simple journey, then
            switch to the technical pipeline to see every hop and how each error is
            handled. Tap the highlighted box to reveal the next step.
          </p>

          {/* legend */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {LEGEND.map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 text-xs text-[var(--body)]"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} aria-hidden="true" />
                {l.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-[var(--rust)]">
              <span className="h-2.5 w-2.5 rounded-sm border border-[var(--rust-border)] bg-[var(--rust-tint)]" aria-hidden="true" />
              Error handling
            </span>
          </div>
        </div>

        <div className="mt-10">
          <WorkflowFlows />
        </div>
        </div>

        <TechStack />

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
          >
            Try it yourself →
          </Link>
          <Link
            href="/architecture"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Read the architecture note
          </Link>
          <a
            href="https://github.com/ahmed-farahat-pro/magna-test/blob/main/VIDEO_SCRIPT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Video shooting script ↗
          </a>
        </div>
      </div>
    </main>
  );
}
