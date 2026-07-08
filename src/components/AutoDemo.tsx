"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A fully automated, looping demo of the whole app — no API calls, all static
 * data. It mirrors the real UI and plays the complete story across three acts:
 *   1. Generate — a topic is typed, a brand voice is applied, the copy streams
 *      in word-by-word, and a matching image "paints" into focus.
 *   2. Improve  — the copy is sent to the improver, a goal is chosen, and a
 *      leveled-up version streams in beside the original with a "what changed".
 *   3. History  — every piece is shown saved to the session, accumulating.
 * Purely illustrative, so the animated stage is aria-hidden with an sr-only
 * description alongside.
 */

type Mode = "generate" | "improve" | "history";

type Phase =
  | "g-type"
  | "g-select"
  | "g-gen"
  | "g-stream"
  | "g-paint"
  | "g-reveal"
  | "g-done"
  | "i-enter"
  | "i-select"
  | "i-improve"
  | "i-stream"
  | "i-done"
  | "h-enter"
  | "h-done";

const modeOf = (p: Phase): Mode =>
  p[0] === "g" ? "generate" : p[0] === "i" ? "improve" : "history";

type Demo = {
  type: string;
  tone: string;
  audience: string;
  topic: string;
  body: string;
  caption: string;
  improveGoal: string;
  improved: string;
  changed: string;
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
      <g stroke="#9cc3bb" strokeWidth="2">
        <line x1="240" y1="150" x2="110" y2="80" />
        <line x1="240" y1="150" x2="120" y2="220" />
        <line x1="240" y1="150" x2="370" y2="86" />
        <line x1="240" y1="150" x2="380" y2="210" />
        <line x1="240" y1="150" x2="240" y2="52" />
      </g>
      {[
        [110, 80],
        [120, 220],
        [370, 86],
        [380, 210],
        [240, 52],
      ].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="16" fill="#2f6d8a" opacity="0.85" />
      ))}
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
      <g transform="translate(170,96)">
        <rect width="140" height="108" rx="16" fill="#ffffff" opacity="0.96" />
        <rect x="20" y="22" width="100" height="12" rx="6" fill="#c96b8f" />
        <rect x="20" y="44" width="72" height="10" rx="5" fill="#e6b8c6" />
        <rect x="20" y="72" width="100" height="20" rx="10" fill="#0e7a63" />
      </g>
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
    improveGoal: "Shorter",
    improved:
      "Stop chasing invoices — automate them.\n\nReminders go out on time, every time, so small teams get paid up to 2x faster. No awkward follow-ups. Reclaim your Fridays.",
    changed:
      "Cut ~40% of the length, kept the hook and the 2x proof, tightened the close.",
    Scene: SceneBlog,
  },
  {
    type: "LinkedIn",
    tone: "Bold",
    audience: "Startup operators",
    topic: "The one task every founder should automate first",
    body: "Most founders automate the wrong thing first.\n\nThey buy tools for problems they do not have yet — and ignore the three hours a week quietly bleeding out of manual invoicing.\n\nStart where the pain actually is. Automate the boring money stuff. Then go build.\n\nWhat is the first task you would hand to a robot?",
    caption: "flat illustration · a network of connections around one clear idea",
    improveGoal: "More persuasive",
    improved:
      "Most founders automate the wrong thing first.\n\nThey chase shiny tools while three hours a week bleed out of manual invoicing — that is 150+ hours a year you will never bill back.\n\nFix the leak first. Automate the money. Then go build.\n\nWhat would you hand to a robot tomorrow?",
    changed:
      "Added a concrete number (150+ hrs/yr), raised the stakes, sharpened the closing question.",
    Scene: SceneLinkedIn,
  },
  {
    type: "Ad copy",
    tone: "Persuasive",
    audience: "Freelancers & agencies",
    topic: "Get paid faster with automated invoice reminders",
    body: "Get paid 2x faster — on autopilot.\n\nStop writing “just following up” emails. Our tool chases every late invoice for you, so the cash lands while you sleep.\n\nNo more awkward reminders. No more waiting. Just paid.\n\nStart free →",
    caption: "bold gradient · a product in the spotlight, high-energy",
    improveGoal: "More formal",
    improved:
      "Accelerate your cash flow with automated invoice reminders.\n\nOur platform follows up on every outstanding invoice automatically, so payments arrive sooner — with no manual chasing required.\n\nBegin with a free trial today.",
    changed:
      "Raised the register for enterprise buyers, removed slang, kept the core benefit.",
    Scene: SceneAd,
  },
];

const BRAND_VOICE = { name: "Acme Co.", chips: ["Witty", "Confident", "Warm"] };

const IMPROVE_GOALS = [
  "Shorter",
  "More persuasive",
  "More formal",
  "SEO",
  "Re-audience",
];

const CONTENT_TYPES = ["Blog post", "LinkedIn", "Ad copy", "Email"];

const TABS: { mode: Mode; label: string }[] = [
  { mode: "generate", label: "Generate" },
  { mode: "improve", label: "Improve" },
  { mode: "history", label: "History" },
];

const NARRATION: Record<Phase, string> = {
  "g-type": "You describe the topic",
  "g-select": "Applying your brand voice",
  "g-gen": "Claude gets to work",
  "g-stream": "Your copy is written live",
  "g-paint": "A matching image is painted",
  "g-reveal": "Your image is ready",
  "g-done": "Saved — now let's refine it",
  "i-enter": "Send it to the Improver",
  "i-select": "Pick an improvement goal",
  "i-improve": "Rewriting with intent",
  "i-stream": "Your copy, leveled up",
  "i-done": "See exactly what changed",
  "h-enter": "Everything's saved to History",
  "h-done": "Revisit or reuse anytime",
};

const labelCls =
  "mb-1.5 block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]";

export default function AutoDemo() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("g-type");
  const [topic, setTopic] = useState("");
  const [genBody, setGenBody] = useState("");
  const [impBody, setImpBody] = useState("");
  const [imgOn, setImgOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

    async function playStory(i: number) {
      const d = DEMOS[i];
      setIdx(i);
      setTopic("");
      setGenBody("");
      setImpBody("");
      setImgOn(false);

      // ── Act 1: Generate ──
      setPhase("g-type");
      await sleep(500);
      await typeInto(d.topic, setTopic, 42);
      await sleep(400);
      setPhase("g-select");
      await sleep(1100);
      setPhase("g-gen");
      await sleep(600);
      setPhase("g-stream");
      await sleep(350);
      await streamWords(d.body, setGenBody, 42);
      await sleep(400);
      setPhase("g-paint");
      await sleep(1300);
      setPhase("g-reveal");
      setImgOn(true);
      await sleep(900);
      setPhase("g-done");
      await sleep(1700);

      // ── Act 2: Improve ──
      setPhase("i-enter");
      await sleep(900);
      setPhase("i-select");
      await sleep(1100);
      setPhase("i-improve");
      await sleep(900);
      setPhase("i-stream");
      await streamWords(d.improved, setImpBody, 40);
      await sleep(400);
      setPhase("i-done");
      await sleep(2500);

      // ── Act 3: History ──
      setPhase("h-enter");
      await sleep(700);
      setPhase("h-done");
      await sleep(2700);
    }

    (async () => {
      await sleep(300);
      // Honor reduced-motion: show one fully-formed example and hold it — no
      // typing, streaming, or auto-cycling between acts.
      if (reduced) {
        const d = DEMOS[0];
        setIdx(0);
        setTopic(d.topic);
        setGenBody(d.body);
        setImgOn(true);
        setPhase("g-done");
        return;
      }
      let i = 0;
      while (!cancelled) {
        await playStory(i);
        i = (i + 1) % DEMOS.length;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const d = DEMOS[idx];
  const mode = modeOf(phase);
  const generating = phase === "g-gen" || phase === "g-stream";
  const showGenText = ["g-stream", "g-paint", "g-reveal", "g-done"].includes(phase);
  const improveActive = ["i-select", "i-improve", "i-stream", "i-done"].includes(
    phase,
  );
  const showImpText = phase === "i-stream" || phase === "i-done";
  const historyItems = DEMOS.slice(0, idx + 1);

  return (
    <div className="w-full">
      <p className="sr-only">
        An automated preview of the whole app: you describe a topic and apply a
        saved brand voice, the app streams finished marketing copy and paints a
        matching image, you send the copy to the improver to sharpen it, and every
        piece is saved to your history to revisit or reuse.
      </p>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-[#d9dfd8] bg-white shadow-xl"
      >
        {/* window chrome + mode tabs */}
        <div className="flex items-center gap-3 border-b border-[#e7ebe6] bg-[#f7f9f6] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#e7c9c0]" />
            <span className="h-3 w-3 rounded-full bg-[#efe0c4]" />
            <span className="h-3 w-3 rounded-full bg-[#cfe3d3]" />
          </div>
          <div className="ml-1 hidden items-center gap-1 sm:flex">
            {TABS.map((t) => (
              <span
                key={t.mode}
                className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] font-semibold transition-colors ${
                  t.mode === mode
                    ? "bg-[#e6f2ec] text-[#0a5346]"
                    : "text-[#5f6960]"
                }`}
              >
                {t.label}
              </span>
            ))}
          </div>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.66rem] text-[#5f6960]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0e7a63]" />
            {NARRATION[phase]}
          </span>
        </div>

        {/* body — a panel per mode, crossfading on mode change */}
        <div className="md:h-[470px]">
          <div key={mode} className="animate-fade-in h-full">
            {/* ── GENERATE ── */}
            {mode === "generate" && (
              <div className="grid h-full grid-cols-1 md:min-h-0 md:grid-cols-[minmax(0,270px)_1fr]">
                {/* form */}
                <div className="flex flex-col gap-3 border-b border-[#e7ebe6] p-4 md:border-b-0 md:border-r">
                  <div>
                    <span className={labelCls}>Content type</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CONTENT_TYPES.map((t) => {
                        const active = t === d.type;
                        return (
                          <div
                            key={t}
                            className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                              active
                                ? "border-[#0e7a63] bg-[#e6f2ec] text-[#0a5346]"
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
                    <span className={labelCls}>Topic</span>
                    <div className="min-h-[56px] rounded-lg border border-[#d9dfd8] bg-white px-3 py-2 text-sm leading-relaxed text-[#141a16]">
                      {topic}
                      {phase === "g-type" && (
                        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink rounded-sm bg-[#0e7a63] align-middle" />
                      )}
                    </div>
                  </div>

                  {/* brand voice — visibly applied */}
                  <div
                    className={`rounded-lg border px-3 py-2 transition-all ${
                      phase === "g-select"
                        ? "border-[#0e7a63] bg-[#e6f2ec] ring-2 ring-[#0e7a63]/20"
                        : "border-[#d9dfd8] bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-[#3c4a54]">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-[#0e7a63] text-[0.6rem] font-bold text-white">
                        ✓
                      </span>
                      <span>
                        Brand voice:{" "}
                        <span className="font-semibold text-[#0a5346]">
                          {BRAND_VOICE.name}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {BRAND_VOICE.chips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-[#bfe0d0] bg-white px-2 py-0.5 text-[0.62rem] font-medium text-[#0a5346]"
                        >
                          {c}
                        </span>
                      ))}
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
                      <>Generate content</>
                    )}
                  </div>
                </div>

                {/* output */}
                <div className="flex min-w-0 flex-col md:h-full md:min-h-0">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#e7ebe6] px-4 py-2.5">
                    <span className="rounded-md bg-[#e6f2ec] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-[#0a5346]">
                      {d.type}
                    </span>
                    <span className="rounded-md bg-[#f2ede4] px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-[#7a5a2e]">
                      in {BRAND_VOICE.name}&apos;s voice
                    </span>
                    <span className="ml-auto font-mono text-[0.66rem] text-[#5f6960]">
                      {phase === "g-done" ? "✓ saved" : "streaming…"}
                    </span>
                  </div>

                  <div className="min-h-[140px] flex-1 overflow-y-auto px-4 py-3 md:min-h-0">
                    {!showGenText ? (
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
                        {genBody}
                        {phase === "g-stream" && (
                          <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-blink rounded-sm bg-[#0e7a63] align-middle" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#e7ebe6] p-4">
                    {phase === "g-paint" ? (
                      <div className="shimmer flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-[#f4f7f3] md:w-[300px]">
                        <span className="font-mono text-xs text-[#5f6960]">
                          Painting your image…
                        </span>
                      </div>
                    ) : imgOn ? (
                      <div className="flex flex-col gap-2">
                        <div
                          key={idx}
                          className="animate-paint-in aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#d9dfd8] md:w-[300px]"
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
                        Generate matching image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── IMPROVE ── */}
            {mode === "improve" && (
              <div className="flex h-full flex-col p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className={labelCls + " mb-0 mr-1"}>Improve goal</span>
                  {IMPROVE_GOALS.map((g) => {
                    const active = improveActive && g === d.improveGoal;
                    return (
                      <span
                        key={g}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-[#b7451e] bg-[#f7e8e0] text-[#8a3315] ring-2 ring-[#b7451e]/15"
                            : "border-[#d9dfd8] bg-white text-[#3c4a54]"
                        }`}
                      >
                        {g}
                      </span>
                    );
                  })}
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                  {/* original */}
                  <div className="flex min-h-[120px] flex-col overflow-hidden rounded-lg border border-[#d9dfd8] bg-[#fbfdfb]">
                    <div className="border-b border-[#e7ebe6] px-3 py-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5f6960]">
                      Original
                    </div>
                    <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-[0.82rem] leading-relaxed text-[#5c665e]">
                      {d.body}
                    </div>
                  </div>
                  {/* improved */}
                  <div className="flex min-h-[120px] flex-col overflow-hidden rounded-lg border border-[#bfe0d0] bg-white">
                    <div className="flex items-center gap-2 border-b border-[#e7ebe6] px-3 py-1.5">
                      <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#0a5346]">
                        Improved
                      </span>
                      <span className="rounded bg-[#e6f2ec] px-1.5 py-0.5 font-mono text-[0.66rem] font-semibold text-[#0a5346]">
                        {d.improveGoal}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 py-2 text-[0.82rem] leading-relaxed text-[#1c241e]">
                      {phase === "i-improve" ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <div className="shimmer h-2.5 w-2/3 rounded bg-[#eff2ee]" />
                          <div className="shimmer h-2.5 w-full rounded bg-[#eff2ee]" />
                          <div className="shimmer h-2.5 w-4/5 rounded bg-[#eff2ee]" />
                        </div>
                      ) : showImpText ? (
                        <div className="whitespace-pre-wrap break-words">
                          {impBody}
                          {phase === "i-stream" && (
                            <span className="ml-0.5 inline-block h-3.5 w-[3px] translate-y-0.5 animate-blink rounded-sm bg-[#0e7a63] align-middle" />
                          )}
                        </div>
                      ) : (
                        <p className="pt-3 text-center text-xs text-[#5f6960]">
                          Choose a goal to sharpen this copy
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-3 rounded-lg border border-[#e7ebe6] bg-[#f4f7f3] px-3 py-2 transition-opacity ${
                    phase === "i-done" ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                    What changed
                  </span>{" "}
                  <span className="text-xs text-[#3c4a54]">{d.changed}</span>
                </div>
              </div>
            )}

            {/* ── HISTORY ── */}
            {mode === "history" && (
              <div className="h-full overflow-y-auto p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className={labelCls + " mb-0"}>
                    Saved this session
                  </span>
                  <span className="font-mono text-xs text-[#5c665e]">
                    {historyItems.length} item
                    {historyItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {historyItems.map((it, k) => (
                    <div
                      key={it.type}
                      style={{ animationDelay: `${k * 110}ms` }}
                      className="animate-fade-up overflow-hidden rounded-xl border border-[#d9dfd8] bg-white"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden border-b border-[#e7ebe6]">
                        <it.Scene />
                      </div>
                      <div className="p-2.5">
                        <span className="rounded bg-[#e6f2ec] px-1.5 py-0.5 font-mono text-[0.66rem] font-semibold text-[#0a5346]">
                          {it.type}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-[0.72rem] leading-snug text-[#3c4a54]">
                          {it.topic}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[0.64rem] text-[#5f6960]">
                  Every generation &amp; improvement is scoped to your session —
                  copy, export, or refine any of them again.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
