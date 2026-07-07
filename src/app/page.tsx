import Link from "next/link";
import AutoDemo from "@/components/AutoDemo";

export const metadata = {
  title: "AI Content Marketing Suite — watch it work",
  description:
    "See it live: type a topic, watch Claude write finished marketing copy, and get a matching AI image — then copy, save, or export. Try the automated demo, then start creating.",
};

const STEPS = [
  {
    n: "1",
    title: "Describe your topic",
    body: "Pick a format — blog, LinkedIn, ad, or email — then give a topic, tone, and audience. Add a brand voice if you have one.",
    icon: IconPencil,
  },
  {
    n: "2",
    title: "Claude writes it live",
    body: "Each format uses its own prompt strategy. The finished copy streams in word-by-word, so you watch it come together in real time.",
    icon: IconSpark,
  },
  {
    n: "3",
    title: "Pair a matching image",
    body: "An art director reads your copy and paints an on-brand image that actually reflects what the post says — in the style you choose.",
    icon: IconImage,
  },
  {
    n: "4",
    title: "Save, copy & export",
    body: "Everything lands in your history. Export any piece as text, Word, or PDF — with the generated image embedded.",
    icon: IconExport,
  },
];

const FEATURES = [
  {
    title: "Four formats, four strategies",
    body: "Blog posts, LinkedIn posts, ad copy, and emails — each written by a purpose-built prompt, not one generic template.",
  },
  {
    title: "Live streaming",
    body: "Copy appears token-by-token as Claude writes, so there is never a blank spinner to stare at.",
  },
  {
    title: "Content-aware images",
    body: "Images are generated from the actual copy, so the picture matches the message — not just the topic.",
  },
  {
    title: "Your brand voice",
    body: "Save a voice — personality, formality, industry, words to use and avoid — and apply it to everything you generate.",
  },
  {
    title: "History that remembers",
    body: "Every generation and improvement is saved to your session, ready to revisit, refine, or reuse.",
  },
  {
    title: "Export anywhere",
    body: "Download as plain text, a real Word .docx, or a PDF — with the matching image baked right in.",
  },
];

export default function Landing() {
  return (
    <main className="flex-1">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* ambient accents */}
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#cfe6d6] opacity-50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#f7e0d2] opacity-50 blur-3xl"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-6 pt-14 text-center sm:pt-20">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[#cfe3d3] bg-white/70 px-3 py-1 font-mono text-xs font-medium text-[#0a5346] backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0e7a63]" />
            Copy + image, in one workflow
          </span>
          <h1
            className="animate-fade-up mx-auto mt-5 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-[#141a16] sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Marketing content that writes itself — and brings its own picture.
          </h1>
          <p
            className="animate-fade-up mx-auto mt-4 max-w-2xl text-pretty text-lg text-[#3c4a54]"
            style={{ animationDelay: "120ms" }}
          >
            Describe a topic, apply your brand voice, and watch Claude write
            finished copy live — then paint a matching image, sharpen it in the
            improver, and save it all to history. Here&apos;s the whole thing,
            running by itself:
          </p>
          <div
            className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0e7a63] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346]"
            >
              Get started — it&apos;s free →
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfd8] bg-white px-6 py-3 text-sm font-semibold text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
            >
              How it works
            </a>
          </div>
        </div>

        {/* the auto-running demo */}
        <div
          className="animate-fade-up relative mx-auto mt-4 max-w-5xl px-4 pb-16 sm:px-6"
          style={{ animationDelay: "240ms" }}
        >
          <AutoDemo />
          <p className="mt-3 text-center font-mono text-xs text-[#5f6960]">
            ↑ A live, automated tour of the whole app — generate, improve &amp;
            history. No clicks needed.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-[#d9dfd8] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
              How it works
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
              From blank page to publish-ready in four steps
            </h2>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="animate-fade-up relative flex flex-col rounded-xl border border-[#d9dfd8] bg-[#fbfdfb] p-5"
                >
                  {/* connector arrow (desktop) */}
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9dfd8] bg-white text-[#0e7a63] md:flex"
                    >
                      ›
                    </span>
                  )}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f2ec] text-[#0a5346]">
                      <Icon />
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#5f6960]">
                      Step {s.n}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#141a16]">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#3c4a54]">
                    {s.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-[#d9dfd8]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
              What&apos;s inside
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
              Everything you need to ship content, faster
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-fade-up rounded-xl border border-[#d9dfd8] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 h-1.5 w-8 rounded-full bg-[#0e7a63]" />
                <h3 className="text-base font-bold text-[#141a16]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#3c4a54]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-[#d9dfd8] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
            Ready to see your topic come to life?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#3c4a54]">
            No sign-up hoops. Pick a format, describe your idea, and get finished
            copy plus a matching image in one pass.
          </p>
          <Link
            href="/create"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0e7a63] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346]"
          >
            Start creating →
          </Link>
        </div>
      </section>
    </main>
  );
}

// ── Inline line icons ────────────────────────────────────────────────────────
function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path
        d="m4 18 5-5 4 4 3-3 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15V3m0 0 4 4m-4-4-4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
