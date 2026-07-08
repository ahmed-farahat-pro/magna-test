import Link from "next/link";
import WorkflowFlows from "@/components/WorkflowFlows";
import TechStack from "@/components/TechStack";

export const metadata = {
  title: "How it works — Workflow | AI Content Marketing Suite",
  description:
    "Two interactive flowcharts: a simple journey for anyone, and the full technical request pipeline with error handling. Click through each step.",
};

const LEGEND: { label: string; dot: string }[] = [
  { label: "You", dot: "bg-[#0e7a63]" },
  { label: "Server", dot: "bg-[#2f5563]" },
  { label: "Claude / OpenAI", dot: "bg-[#5b3f8a]" },
  { label: "Database / Storage", dot: "bg-[#7a5a2e]" },
];

export default function WorkflowPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
        <div className="animate-fade-up text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
            Workflow
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141a16] sm:text-4xl">
            How the app works — click through it
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[#3c4a54]">
            Two flowcharts for two audiences. Start with the simple journey, then
            switch to the technical pipeline to see every hop and how each error is
            handled. Tap the highlighted box to reveal the next step.
          </p>

          {/* legend */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {LEGEND.map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 text-xs text-[#3c4a54]"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} aria-hidden="true" />
                {l.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-[#8a3315]">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#e3c9bd] bg-[#f9ede5]" aria-hidden="true" />
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
            className="inline-flex items-center gap-2 rounded-lg bg-[#0e7a63] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346]"
          >
            Try it yourself →
          </Link>
          <Link
            href="/architecture"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfd8] bg-white px-6 py-3 text-sm font-semibold text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
          >
            Read the architecture note
          </Link>
          <a
            href="https://github.com/ahmed-farahat-pro/magna-test/blob/main/VIDEO_SCRIPT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfd8] bg-white px-6 py-3 text-sm font-semibold text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
          >
            Video shooting script ↗
          </a>
        </div>
      </div>
    </main>
  );
}
