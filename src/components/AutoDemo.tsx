"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A fully automated, looping demo of the app — no API calls, all static data.
 * It mirrors the real generator UI and plays the whole flow: a topic is typed
 * out, the copy streams in word-by-word, then a matching image "paints" into
 * focus. Purely illustrative, so the animated stage is aria-hidden with an
 * sr-only description alongside.
 */

type Phase =
  | "typing"
  | "selecting"
  | "generating"
  | "streaming"
  | "painting"
  | "reveal"
  | "done";

type Demo = {
  type: string;
  tone: string;
  audience: string;
  topic: string;
  body: string;
  caption: string;
  accent: "green" | "blue" | "amber";
  Scene: () => ReactNode;
};

// ── Static "generated" cover art (stands in for the AI image) ────────────────
function SceneBlog() {
  return (
    <svg viewBox="0 0 480 300" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="blogBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eaf5ef" />
          <stop offset="1" stopColor="#cfe6d6" />
        </linearGradient>
        <radialGradient id="blogSun" cx="0.82" cy="0.2" r="0.5">
          <stop offset="0" stopColor="#ffd9a8" />
          <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="300" fill="url(#blogBg)" />
      <rect width="480" height="300" fill="url(#blogSun)" />
      <circle cx="386" cy="66" r="40" fill="#f4b878" />
      <rect y="214" width="480" height="86" fill="#bfdcc6" />
      {/* coffee */}
      <g transform="translate(64,150)">
        <rect x="8" y="6" width="6" height="14" rx="3" fill="#8fd6bf" />
        <rect x="24" y="0" width="6" height="20" rx="3" fill="#8fd6bf" />
        <rect y="22" width="58" height="44" rx="10" fill="#0e7a63" />
        <path
          d="M58 32 h12 a12 12 0 0 1 0 22 h-12"
          fill="none"
          stroke="#0e7a63"
          strokeWidth="6"
        />
      </g>
      {/* paid invoice cards */}
      <g transform="translate(198,58)">
        <rect
          width="128"
          height="84"
          rx="12"
          fill="#ffffff"
          stroke="#bfe6d6"
          strokeWidth="2"
        />
        <rect x="16" y="18" width="72" height="9" rx="4" fill="#cfe3d3" />
        <rect x="16" y="36" width="52" height="9" rx="4" fill="#e3efe6" />
        <circle cx="100" cy="60" r="15" fill="#0e7a63" />
        <path
          d="M93 60 l5 5 l10 -12"
          stroke="#fff"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(300,120)" opacity="0.9">
        <rect
          width="112"
          height="72"
          rx="12"
          fill="#ffffff"
          stroke="#bfe6d6"
          strokeWidth="2"
        />
        <rect x="14" y="16" width="60" height="8" rx="4" fill="#cfe3d3" />
        <rect x="14" y="32" width="44" height="8" rx="4" fill="#e3efe6" />
        <circle cx="86" cy="52" r="13" fill="#0e7a63" />
        <path
          d="M80 52 l4 4 l9 -10"
          stroke="#fff"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function SceneLinkedIn() {
  return (
    <svg viewBox="0 0 480 300" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="liBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7f0f4" />
          <stop offset="1" stopColor="#d3e6e0" />
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill="url(#liBg)" />
      {/* connections */}
      <g stroke="#9cc3bb" strokeWidth="2">
        <line x1="240" y1="150" x2="110" y2="80" />
        <line x1="240" y1="150" x2="120" y2="220" />
        <line x1="240" y1="150" x2="370" y2="86" />
        <line x1="240" y1="150" x2="380" y2="210" />
        <line x1="240" y1="150" x2="240" y2="52" />
      </g>
      {/* satellite nodes */}
      {[
        [110, 80],
        [120, 220],
        [370, 86],
        [380, 210],
        [240, 52],
      ].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="16" fill="#2f6d8a" opacity="0.85" />
      ))}
      {/* central avatar */}
      <circle cx="240" cy="150" r="42" fill="#0e7a63" />
      <circle cx="240" cy="136" r="15" fill="#eaf5ef" />
      <path d="M214 176 a26 22 0 0 1 52 0 z" fill="#eaf5ef" />
      <circle
        cx="240"
        cy="150"
        r="54"
        fill="none"
        stroke="#0e7a63"
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  );
}

function SceneAd() {
  return (
    <svg viewBox="0 0 480 300" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="adBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7d9b8" />
          <stop offset="0.5" stopColor="#e79a86" />
          <stop offset="1" stopColor="#c96b8f" />
        </linearGradient>
        <radialGradient id="adGlow" cx="0.5" cy="0.42" r="0.5">
          <stop offset="0" stopColor="#fff4e6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff4e6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="300" fill="url(#adBg)" />
      {/* rays */}
      <g stroke="#ffffff" strokeWidth="10" opacity="0.18" strokeLinecap="round">
        <line x1="240" y1="150" x2="240" y2="-40" />
        <line x1="240" y1="150" x2="470" y2="10" />
        <line x1="240" y1="150" x2="520" y2="180" />
        <line x1="240" y1="150" x2="360" y2="360" />
        <line x1="240" y1="150" x2="90" y2="360" />
        <line x1="240" y1="150" x2="-40" y2="180" />
        <line x1="240" y1="150" x2="10" y2="10" />
      </g>
      <rect width="480" height="300" fill="url(#adGlow)" />
      {/* product card */}
      <g transform="translate(170,96)">
        <rect
          width="140"
          height="108"
          rx="16"
          fill="#ffffff"
          opacity="0.96"
        />
        <rect x="20" y="22" width="100" height="12" rx="6" fill="#c96b8f" />
        <rect x="20" y="44" width="72" height="10" rx="5" fill="#e6b8c6" />
        <rect
          x="20"
          y="72"
          width="100"
          height="20"
          rx="10"
          fill="#0e7a63"
        />
      </g>
      {/* sparkles */}
      {[
        [120, 70, 6],
        [360, 90, 8],
        [380, 210, 5],
        [110, 220, 7],
      ].map(([x, y, r], k) => (
        <circle key={k} cx={x} cy={y} r={r} fill="#fff6ec" opacity="0.9" />
      ))}
    </svg>
  );
}

const DEMOS: Demo[] = [
  {
    type: "Blog post",
    tone: "Witty",
    audience: "B2B SaaS founders",
    topic: "Why small teams should automate invoicing",
    body: "Stop chasing invoices. Let them chase themselves.\n\nSmall teams lose hours every week nudging clients for money they have already earned. Automating your invoicing flips the script: reminders go out on time, every time — so you get paid up to 2x faster without a single awkward follow-up.\n\nReclaim your Fridays. Your cash flow will thank you.",
    caption: "photographic · a founder relaxing while invoices settle themselves",
    accent: "green",
    Scene: SceneBlog,
  },
  {
    type: "LinkedIn",
    tone: "Bold",
    audience: "Startup operators",
    topic: "The one task every founder should automate first",
    body: "Most founders automate the wrong thing first.\n\nThey buy tools for problems they do not have yet — and ignore the three hours a week quietly bleeding out of manual invoicing.\n\nStart where the pain actually is. Automate the boring money stuff. Then go build.\n\nWhat is the first task you would hand to a robot?",
    caption: "flat illustration · a network of connections around one clear idea",
    accent: "blue",
    Scene: SceneLinkedIn,
  },
  {
    type: "Ad copy",
    tone: "Persuasive",
    audience: "Freelancers & agencies",
    topic: "Get paid faster with automated invoice reminders",
    body: "Get paid 2x faster — on autopilot.\n\nStop writing “just following up” emails. Our tool chases every late invoice for you, so the cash lands while you sleep.\n\nNo more awkward reminders. No more waiting. Just paid.\n\nStart free →",
    caption: "bold gradient · a product in the spotlight, high-energy",
    accent: "amber",
    Scene: SceneAd,
  },
];

const STEPS = ["Describe", "Write", "Illustrate", "Export"] as const;

function phaseStep(p: Phase): number {
  if (p === "typing" || p === "selecting") return 0;
  if (p === "generating" || p === "streaming") return 1;
  if (p === "painting" || p === "reveal") return 2;
  return 3;
}

const NARRATION: Record<Phase, string> = {
  typing: "You describe the topic",
  selecting: "Pick a format & tone",
  generating: "Claude gets to work",
  streaming: "Your copy is written live",
  painting: "A matching image is painted",
  reveal: "Your image is ready",
  done: "Copy, save, or export",
};

const CONTENT_TYPES = ["Blog post", "LinkedIn", "Ad copy", "Email"];

export default function AutoDemo() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [imgOn, setImgOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms: number) =>
      new Promise<void>((r) => setTimeout(r, ms));

    async function typeInto(text: string, set: (s: string) => void, per: number) {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        set(text.slice(0, i));
        await sleep(per);
      }
    }
    async function streamWords(text: string, set: (s: string) => void, per: number) {
      const tokens = text.match(/\s*\S+/g) ?? [];
      let acc = "";
      for (const t of tokens) {
        if (cancelled) return;
        acc += t;
        set(acc);
        await sleep(per);
      }
    }

    async function play(i: number) {
      const d = DEMOS[i];
      setIdx(i);
      setTopic("");
      setBody("");
      setImgOn(false);

      if (reduced) {
        setPhase("done");
        setTopic(d.topic);
        setBody(d.body);
        setImgOn(true);
        return;
      }

      setPhase("typing");
      await sleep(500);
      await typeInto(d.topic, setTopic, 42);
      await sleep(500);
      setPhase("selecting");
      await sleep(850);
      setPhase("generating");
      await sleep(650);
      setPhase("streaming");
      await sleep(450);
      await streamWords(d.body, setBody, 46);
      await sleep(550);
      setPhase("painting");
      await sleep(1400);
      setPhase("reveal");
      setImgOn(true);
      await sleep(1000);
      setPhase("done");
      await sleep(2400);
    }

    (async () => {
      await sleep(300);
      // Honor reduced-motion: show one fully-formed example and hold it — no
      // auto-cycling (which would swap the whole panel every few seconds).
      if (reduced) {
        await play(0);
        return;
      }
      let i = 0;
      while (!cancelled) {
        await play(i);
        i = (i + 1) % DEMOS.length;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const d = DEMOS[idx];
  const step = phaseStep(phase);
  const generating = phase === "generating" || phase === "streaming";
  const showText =
    phase === "streaming" ||
    phase === "painting" ||
    phase === "reveal" ||
    phase === "done";

  return (
    <div className="w-full">
      <p className="sr-only">
        An automated preview: you type a topic, choose a format and tone, and the
        app streams finished marketing copy and generates a matching image, ready
        to copy, save, or export.
      </p>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-[#d9dfd8] bg-white shadow-xl"
      >
        {/* window chrome + stepper */}
        <div className="flex items-center gap-3 border-b border-[#e7ebe6] bg-[#f7f9f6] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#e7c9c0]" />
            <span className="h-3 w-3 rounded-full bg-[#efe0c4]" />
            <span className="h-3 w-3 rounded-full bg-[#cfe3d3]" />
          </div>
          <div className="ml-1 hidden items-center gap-1.5 sm:flex">
            {STEPS.map((s, k) => (
              <span
                key={s}
                className={`rounded-full px-2.5 py-1 font-mono text-[0.66rem] font-semibold transition-colors ${
                  k === step
                    ? "bg-[#0e7a63] text-white"
                    : k < step
                      ? "bg-[#e6f2ec] text-[#0a5346]"
                      : "bg-white text-[#5f6960]"
                }`}
              >
                {k + 1}. {s}
              </span>
            ))}
          </div>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.66rem] text-[#5f6960]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0e7a63]" />
            {NARRATION[phase]}
          </span>
        </div>

        {/* body: form | output */}
        <div className="grid grid-cols-1 md:h-[470px] md:grid-cols-[minmax(0,270px)_1fr]">
          {/* form */}
          <div className="flex flex-col gap-3.5 border-b border-[#e7ebe6] p-4 md:border-b-0 md:border-r">
            <div>
              <span className="mb-1.5 block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                Content type
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {CONTENT_TYPES.map((t) => {
                  const active = t === d.type;
                  return (
                    <div
                      key={t}
                      className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                        active
                          ? `border-[#0e7a63] bg-[#e6f2ec] text-[#0a5346] ${phase === "selecting" ? "ring-2 ring-[#0e7a63]/25" : ""}`
                          : "border-[#d9dfd8] bg-white text-[#3c4a54]"
                      }`}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                Topic
              </span>
              <div className="min-h-[68px] rounded-lg border border-[#d9dfd8] bg-white px-3 py-2 text-sm leading-relaxed text-[#141a16]">
                {topic}
                {phase === "typing" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink rounded-sm bg-[#0e7a63] align-middle" />
                )}
                {!topic && phase !== "typing" && (
                  <span className="text-[#5f6960]">{d.topic}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <span className="mb-1.5 block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                  Tone
                </span>
                <div className="rounded-lg border border-[#d9dfd8] bg-white px-3 py-2 text-xs text-[#3c4a54]">
                  {d.tone}
                </div>
              </div>
              <div className="flex-[1.4]">
                <span className="mb-1.5 block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                  Audience
                </span>
                <div className="truncate rounded-lg border border-[#d9dfd8] bg-white px-3 py-2 text-xs text-[#3c4a54]">
                  {d.audience}
                </div>
              </div>
            </div>

            <div
              className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all ${
                generating ? "bg-[#0a5346]" : "bg-[#0e7a63]"
              }`}
            >
              {generating ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating…
                </>
              ) : (
                <>✨ Generate content</>
              )}
            </div>
          </div>

          {/* output */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2 border-b border-[#e7ebe6] px-4 py-2.5">
              <span className="rounded-md bg-[#e6f2ec] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-[#0a5346]">
                {d.type}
              </span>
              <span className="font-mono text-[0.66rem] text-[#5f6960]">
                {phase === "done" ? "✓ saved to history" : "streaming…"}
              </span>
            </div>

            {/* text region */}
            <div className="min-h-[150px] flex-1 overflow-y-auto px-4 py-3 md:min-h-0">
              {!showText ? (
                <div className="flex flex-col gap-2.5">
                  {generating ? (
                    <>
                      <div className="shimmer h-3 w-1/3 rounded bg-[#e7ebe6]" />
                      <div className="shimmer h-3 w-11/12 rounded bg-[#eff2ee]" />
                      <div className="shimmer h-3 w-full rounded bg-[#eff2ee]" />
                      <div className="shimmer h-3 w-5/6 rounded bg-[#eff2ee]" />
                    </>
                  ) : (
                    <p className="pt-6 text-center text-xs text-[#5f6960]">
                      Your generated content will appear here
                    </p>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1c241e]">
                  {body}
                  {phase === "streaming" && (
                    <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-blink rounded-sm bg-[#0e7a63] align-middle" />
                  )}
                </div>
              )}
            </div>

            {/* image region */}
            <div className="border-t border-[#e7ebe6] p-4">
              {phase === "painting" ? (
                <div className="shimmer flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-[#f4f7f3] md:w-[320px]">
                  <span className="font-mono text-xs text-[#5f6960]">
                    Painting your image…
                  </span>
                </div>
              ) : imgOn ? (
                <div className="flex flex-col gap-2">
                  <div
                    key={idx}
                    className="animate-paint-in aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#d9dfd8] md:w-[320px]"
                  >
                    <d.Scene />
                  </div>
                  <p className="font-mono text-[0.64rem] leading-relaxed text-[#5f6960]">
                    <span className="text-[#5c665e]">auto-prompt:</span>{" "}
                    {d.caption}
                  </p>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#d9c3b8] bg-[#f7e8e0] px-3.5 py-2 text-xs font-semibold text-[#8a3315]">
                  🖼 Generate matching image
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
