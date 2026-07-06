const FEATURES = [
  {
    tag: "01 · Generator",
    title: "Multi-format content",
    body: "Blog posts, LinkedIn posts, ad copy, and email — each with its own prompt strategy, powered by Claude.",
    tone: "text" as const,
  },
  {
    tag: "02 · Featured",
    title: "Per-post AI image",
    body: "One click builds a visual prompt from your topic and tone, generates a DALL·E 3 image, and pairs it with the text.",
    tone: "img" as const,
  },
  {
    tag: "03 · Dashboard",
    title: "History & library",
    body: "Every generation saved per session — view, copy, download, and delete. Fast and paginated.",
    tone: "text" as const,
  },
  {
    tag: "04 · Improver",
    title: "Refine existing copy",
    body: "Paste text, pick a goal — shorter, more persuasive, SEO — and get a rewrite plus what changed.",
    tone: "text" as const,
  },
];

function Dot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${className}`} />;
}

export default function Home() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        {/* status + eyebrow */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0d8] bg-[#e6f2ec] px-3 py-1 font-mono text-xs font-medium text-[#0a5346]">
            <Dot className="bg-[#12a37f] animate-pulse" />
            Live · skeleton deployed
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#5c665e]">
            Magna Labs · Technical Assessment
          </span>
        </div>

        {/* hero */}
        <h1 className="mt-8 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#141a16] sm:text-6xl">
          AI Content Marketing Suite
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#3c4a54]">
          Create, manage, and optimize marketing content with AI — generate copy
          for multiple formats and a matching image for each post, all in one
          workflow. Every AI call runs server-side behind clean REST endpoints.
        </p>

        {/* stack chips */}
        <div className="mt-8 flex flex-wrap gap-2 font-mono text-xs text-[#3c4a54]">
          {[
            ["p", "Next.js 16 · TypeScript"],
            ["p", "Claude sonnet-5"],
            ["r", "DALL·E 3"],
            ["n", "Neon · Prisma"],
            ["n", "Vercel · Blob"],
          ].map(([tone, label]) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-[#d9dfd8] bg-white px-3 py-1.5"
            >
              <Dot
                className={
                  tone === "p"
                    ? "bg-[#0e7a63]"
                    : tone === "r"
                      ? "bg-[#b7451e]"
                      : "bg-[#3c4a54]"
                }
              />
              {label}
            </span>
          ))}
        </div>

        {/* features */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#d9dfd8] bg-white p-6"
              style={{
                borderLeft: `3px solid ${f.tone === "img" ? "#b7451e" : "#0e7a63"}`,
              }}
            >
              <div
                className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em]"
                style={{ color: f.tone === "img" ? "#8a3315" : "#0a5346" }}
              >
                {f.tag}
              </div>
              <h3 className="mt-2 text-lg font-bold text-[#141a16]">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#3c4a54]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <footer className="mt-8 border-t border-[#d9dfd8]">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-xs text-[#8a938b]">
          <span>Deploy pipeline live — core generator shipping next.</span>
          <a
            className="rounded-md border border-[#d9dfd8] bg-white px-3 py-1.5 text-[#0a5346] transition-colors hover:border-[#0e7a63]"
            href="/api/health"
          >
            GET /api/health →
          </a>
        </div>
      </footer>
    </main>
  );
}
