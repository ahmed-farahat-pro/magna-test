/* eslint-disable @next/next/no-img-element */
import type { IconType } from "react-icons";
import {
  SiVercel,
  SiAnthropic,
  SiNeon,
  SiUpstash,
  SiPrisma,
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiTailwindcss,
} from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";

// "Why this stack" — the technologies the app is built on and, more importantly,
// WHY each was chosen. Uses the real brand logos (Simple Icons via react-icons).

type Tech = {
  Icon: IconType;
  color: string; // brand color, or var(--ink) for black/white marks
  name: string;
  role: string;
  why: string;
};

const AI: Tech[] = [
  {
    Icon: SiAnthropic,
    color: "#D97757",
    name: "Anthropic Claude",
    role: "Writes the copy",
    why: "Model claude-sonnet-5. It follows brand-voice and format instructions precisely and returns clean, structured output — so blog, LinkedIn, ad, and email each get a purpose-built result rather than one generic template. It streams token-by-token, which is what makes the copy appear live instead of behind a spinner.",
  },
  {
    Icon: RiOpenaiFill,
    color: "var(--ink)",
    name: "OpenAI — images",
    role: "Paints the picture",
    why: "Strong text-to-image turns the finished copy into a matching visual. Because image-model access varies per account, it runs a fallback chain (gpt-image-1 → dall-e-3 → dall-e-2) so image generation keeps working whatever a given key can reach.",
  },
];

const INFRA: Tech[] = [
  {
    Icon: SiNeon,
    color: "#00E599",
    name: "Neon",
    role: "Serverless Postgres",
    why: "Real Postgres with no server to run — it scales to zero and pairs cleanly with serverless. We use a pooled connection for the app's many short-lived functions and a direct connection for migrations. One Generation table is the single source of truth for history.",
  },
  {
    Icon: SiVercel,
    color: "var(--ink)",
    name: "Vercel",
    role: "Hosting & the edge",
    why: "Zero-config Next.js deploys, Edge middleware that mints the signed session cookie before any request hits an API route, and automatic preview deploys. The whole app — frontend and API — ships as one unit.",
  },
  {
    Icon: SiVercel,
    color: "var(--ink)",
    name: "Vercel Blob",
    role: "Permanent image URLs",
    why: "Image-model URLs expire in about an hour. So every generated PNG is downloaded and re-hosted on Blob, and we store that permanent URL — never the expiring one — with an /api/img proxy in front of private stores.",
  },
  {
    Icon: SiUpstash,
    color: "#00C98D",
    name: "Upstash Redis",
    role: "Durable rate limiting",
    why: "Serverless Redis over HTTP means there's no persistent connection to exhaust across many lambdas — so a sliding-window rate limit is shared globally and survives cold starts. It falls back to an in-memory limiter when it isn't configured, so the app never hard-depends on it.",
  },
  {
    Icon: SiPrisma,
    color: "var(--ink)",
    name: "Prisma",
    role: "Type-safe data",
    why: "One schema drives fully type-safe queries and versioned migrations that apply automatically at deploy time — so the database shape and the TypeScript types never drift apart.",
  },
];

const FOUNDATION: { Icon: IconType; color: string; name: string }[] = [
  { Icon: SiNextdotjs, color: "var(--ink)", name: "Next.js" },
  { Icon: SiReact, color: "#61DAFB", name: "React" },
  { Icon: SiTypescript, color: "#3178C6", name: "TypeScript" },
  { Icon: SiTailwindcss, color: "#06B6D4", name: "Tailwind" },
];

function Tile({ Icon, color, size = 26 }: { Icon: IconType; color: string; size?: number }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)]">
      <Icon size={size} style={{ color }} />
    </span>
  );
}

function Card({ t }: { t: Tech }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent-border)]">
      <div className="flex items-center gap-3">
        <Tile Icon={t.Icon} color={t.color} />
        <div>
          <h3 className="text-base font-bold text-[var(--ink)]">{t.name}</h3>
          <span className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted-2)]">
            {t.role}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--body)]">
        <span className="font-semibold text-[var(--accent-strong)]">Why: </span>
        {t.why}
      </p>
    </div>
  );
}

export default function TechStack() {
  return (
    <section className="mt-16">
      <div className="text-center">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
          Why this stack
        </span>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          Every piece was chosen for a reason
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-[var(--body)]">
          Not a pile of trendy tools — a small stack where each choice earns its
          place. Here&apos;s what does what, and why.
        </p>
      </div>

      <h3 className="mt-10 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
        The AI
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {AI.map((t) => (
          <Card key={t.name} t={t} />
        ))}
      </div>

      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
        Data &amp; infrastructure
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {INFRA.map((t) => (
          <Card key={t.name} t={t} />
        ))}
      </div>

      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
        App foundation
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOUNDATION.map((f) => (
          <div
            key={f.name}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
          >
            <Tile Icon={f.Icon} color={f.color} size={22} />
            <span className="text-sm font-semibold text-[var(--ink)]">{f.name}</span>
          </div>
        ))}
      </div>

      <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
        Cookies &amp; identity
      </h3>
      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-[var(--amber-border)] bg-[var(--amber-tint)] p-5 sm:flex-row sm:items-start">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--amber-border)] bg-[var(--surface)]">
          <img src="/icons/cookie.svg" alt="A chocolate-chip cookie" width={44} height={44} />
        </span>
        <div>
          <h3 className="text-base font-bold text-[var(--ink)]">
            Why the app uses cookies (and why the banner says “essential only”)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--body)]">
            Two small, <span className="font-semibold">httpOnly, HMAC-signed</span>{" "}
            cookies — nothing more. The <span className="font-semibold">session</span>{" "}
            cookie gives you a durable identity with zero friction (no login
            needed) and scopes every read and write to only your data. The{" "}
            <span className="font-semibold">auth</span> cookie keeps you signed in
            for 7 days once you make an account, so your work follows you across
            devices. They&apos;re strictly functional — no tracking pixels, no ad
            networks, no third parties — which is exactly why the consent banner
            can honestly promise{" "}
            <span className="font-semibold">essential cookies only</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
