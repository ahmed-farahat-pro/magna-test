/* eslint-disable @next/next/no-img-element */

// "Why this stack" — the technologies the app is built on and, more importantly,
// WHY each was chosen. Icons live in /public/icons (originals, not brand artwork).

type Tech = {
  icon: string;
  name: string;
  role: string;
  why: string;
  tint: string;
};

const AI: Tech[] = [
  {
    icon: "anthropic",
    name: "Anthropic Claude",
    role: "Writes the copy",
    tint: "#f4e6de",
    why: "Model claude-sonnet-5. It follows brand-voice and format instructions precisely and returns clean, structured output — so blog, LinkedIn, ad, and email each get a purpose-built result rather than one generic template. It streams token-by-token, which is what makes the copy appear live instead of behind a spinner.",
  },
  {
    icon: "openai",
    name: "OpenAI — images",
    role: "Paints the picture",
    tint: "#dff0ea",
    why: "Strong text-to-image turns the finished copy into a matching visual. Because image-model access varies per account, it runs a fallback chain (gpt-image-1 → dall-e-3 → dall-e-2) so image generation keeps working whatever a given key can reach.",
  },
];

const INFRA: Tech[] = [
  {
    icon: "neon",
    name: "Neon",
    role: "Serverless Postgres",
    tint: "#dcf5ec",
    why: "Real Postgres with no server to run — it scales to zero and pairs cleanly with serverless. We use a pooled connection for the app's many short-lived functions and a direct connection for migrations. One Generation table is the single source of truth for history.",
  },
  {
    icon: "vercel",
    name: "Vercel",
    role: "Hosting & the edge",
    tint: "#ededed",
    why: "Zero-config Next.js deploys, Edge middleware that mints the signed session cookie before any request hits an API route, and automatic preview deploys. The whole app — frontend and API — ships as one unit.",
  },
  {
    icon: "blob",
    name: "Vercel Blob",
    role: "Permanent image URLs",
    tint: "#ededed",
    why: "Image-model URLs expire in about an hour. So every generated PNG is downloaded and re-hosted on Blob, and we store that permanent URL — never the expiring one — with an /api/img proxy in front of private stores.",
  },
  {
    icon: "upstash",
    name: "Upstash Redis",
    role: "Durable rate limiting",
    tint: "#d9f5ea",
    why: "Serverless Redis over HTTP means there's no persistent connection to exhaust across many lambdas — so a sliding-window rate limit is shared globally and survives cold starts. It falls back to an in-memory limiter when it isn't configured, so the app never hard-depends on it.",
  },
  {
    icon: "prisma",
    name: "Prisma",
    role: "Type-safe data",
    tint: "#e7ebef",
    why: "One schema drives fully type-safe queries and versioned migrations that apply automatically at deploy time — so the database shape and the TypeScript types never drift apart.",
  },
];

const FOUNDATION = [
  { icon: "nextjs", name: "Next.js" },
  { icon: "react", name: "React" },
  { icon: "typescript", name: "TypeScript" },
  { icon: "tailwind", name: "Tailwind" },
];

function Icon({ name, tint }: { name: string; tint?: string }) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#e2e8e2]"
      style={{ background: tint ?? "#ffffff" }}
    >
      <img src={`/icons/${name}.svg`} alt="" width={30} height={30} />
    </span>
  );
}

function Card({ t }: { t: Tech }) {
  return (
    <div className="rounded-2xl border border-[#d9dfd8] bg-white p-5">
      <div className="flex items-center gap-3">
        <Icon name={t.icon} tint={t.tint} />
        <div>
          <h3 className="text-base font-bold text-[#141a16]">{t.name}</h3>
          <span className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[#5c665e]">
            {t.role}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#3c4a54]">
        <span className="font-semibold text-[#0a5346]">Why: </span>
        {t.why}
      </p>
    </div>
  );
}

export default function TechStack() {
  return (
    <section className="mt-16">
      <div className="text-center">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
          Why this stack
        </span>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
          Every piece was chosen for a reason
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-[#3c4a54]">
          Not a pile of trendy tools — a small stack where each choice earns its
          place. Here&apos;s what does what, and why.
        </p>
      </div>

      {/* AI */}
      <h3 className="mt-10 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
        The AI
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {AI.map((t) => (
          <Card key={t.name} t={t} />
        ))}
      </div>

      {/* Data & infra */}
      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
        Data &amp; infrastructure
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {INFRA.map((t) => (
          <Card key={t.name} t={t} />
        ))}
      </div>

      {/* App foundation */}
      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
        App foundation
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOUNDATION.map((f) => (
          <div
            key={f.name}
            className="flex items-center gap-3 rounded-xl border border-[#d9dfd8] bg-white p-3.5"
          >
            <Icon name={f.icon} />
            <span className="text-sm font-semibold text-[#141a16]">{f.name}</span>
          </div>
        ))}
      </div>

      {/* Cookies — the reason */}
      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5c665e]">
        Cookies &amp; identity
      </h3>
      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-[#e6d3ad] bg-[#faf3e6] p-5 sm:flex-row sm:items-start">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#e6d3ad] bg-white">
          <img src="/icons/cookie.svg" alt="A chocolate-chip cookie" width={44} height={44} />
        </span>
        <div>
          <h3 className="text-base font-bold text-[#141a16]">
            Why the app uses cookies (and why the banner says “essential only”)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#3c4a54]">
            Two small, <span className="font-semibold">httpOnly, HMAC-signed</span>{" "}
            cookies — nothing more. The <span className="font-semibold">session</span>{" "}
            cookie gives you a durable identity with zero friction (no login
            needed) and scopes every read and write to only your data. The{" "}
            <span className="font-semibold">auth</span> cookie keeps you signed in
            for 7 days once you make an account, so your work follows you across
            devices. They&apos;re strictly functional — no tracking pixels, no ad
            networks, no third parties — which is exactly why the consent banner
            can honestly promise <span className="font-semibold">essential cookies only</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
