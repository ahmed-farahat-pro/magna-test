import Link from "next/link";

export const metadata = {
  title: "Architecture Note — AI Content Marketing Suite",
  description:
    "Design choices, trade-offs, and what I'd build next — a one-page architecture note.",
};

const REPO_FILE = "https://github.com/ahmed-farahat-pro/magna-test/blob/main/ARCHITECTURE.md";

const CHOICES: [string, string][] = [
  [
    "The API is the backend",
    "Next.js route handlers under src/app/api/* are the REST layer — one deploy unit, no separate server, and every AI/storage secret stays server-side. The browser only ever calls /api/*.",
  ],
  [
    "One Generation model",
    "A single table holds both generated content and improvements, with the image fields on the same row — one history query, one ownership rule, no joins.",
  ],
  [
    "Two-layer identity, one owner id",
    "An HMAC-signed anonymous sessionId cookie is minted by Edge middleware; signing up adds an email + password account (scrypt hash, 7-day token). A single getActor() collapses both into one owner id, so every read/write stays scoped where { id, sessionId } — and anonymous work migrates onto the account in one transaction at sign-up.",
  ],
  [
    "Observability without a vendor",
    "An append-only ActivityEvent log records each action (new anonymous session, text/image/improve, signup/login). A password-gated admin dashboard aggregates it into traffic, usage-by-type, a 14-day chart, the user-vs-anonymous split, and per-user counts — and can delete a user, cascading their content. Writes are best-effort, so analytics never slow or break a user action.",
  ],
  [
    "Streaming for perceived speed",
    "/api/generate streams copy token-by-token, then a record-separator byte + a small JSON trailer carry the saved id — so the UI feels instant instead of waiting on a spinner.",
  ],
  [
    "Content-aware images",
    "An “art-director” Claude step reads the finished copy and distills it into one concrete scene; the user's chosen style then renders it. It always falls back to a deterministic prompt, so image generation never depends on it.",
  ],
  [
    "Permanence & resilience",
    "Model image URLs expire, so PNGs are re-hosted on Vercel Blob (with an /api/img proxy for private stores). The image model uses a fallback chain (gpt-image-1 → dall-e-3 → dall-e-2) to survive per-account availability.",
  ],
  [
    "Declarative failures",
    "A single classifier maps any AI / SDK / network error to a plain-language, actionable message — retry vs. config-fix vs. rephrase.",
  ],
];

const TRADEOFFS: [string, string][] = [
  [
    "Single operator admin, credentials in env",
    "The admin is one ADMIN_USERNAME / ADMIN_PASSWORD account — no admin table, nothing to seed or leak — at the cost of no per-admin roles or audit-of-admins. Right-sized for this scope.",
  ],
  [
    "Client-side export, no render service",
    "No extra infra, and dynamic imports keep it out of the initial bundle — but it runs in the browser. Word needs a real .docx (the docx lib), because HTML-in-.doc won't render embedded data-URI images in Word desktop.",
  ],
  [
    "An extra Claude call for images",
    "The art-director step adds latency and cost; it's bounded with an 8-second timeout so a slow call can't block the request.",
  ],
];

const NEXT: { title: string; body: string; starred: boolean }[] = [
  {
    title: "A Canva-style text overlay",
    body: "Place and style text directly on top of the generated photos — headlines, captions, and CTAs baked into the image.",
    starred: true,
  },
  {
    title: "A small in-browser photo editor",
    body: "Crop, filters, brightness/contrast, and background tweaks on the generated image without leaving the app.",
    starred: true,
  },
  {
    title: "Richer text styling in generation",
    body: "Choose fonts, sizes, and weights so the copy can be exported already-styled — an extra layer on top of the content.",
    starred: true,
  },
  {
    title: "Team workspaces & roles",
    body: "Shared brand voices and history across a team, per-seat permissions, and multiple admins with an audit trail.",
    starred: false,
  },
];

// Since the first cut: email + password accounts (with anonymous-work migration,
// disposable-email blocking, and a password-strength meter), an admin dashboard
// with full activity tracking + user management, durable rate limiting (Upstash +
// in-memory fallback), server-side multiple brand voices (create / edit / delete,
// pick one per generation), and hard "avoid"-word enforcement (detect + one-click
// rewrite) were all shipped — so they moved out of trade-offs / what's-next.

function Section({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: [string, string][];
}) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
        {eyebrow}
      </h2>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map(([title, body]) => (
          <li
            key={title}
            className="rounded-xl border border-[#d9dfd8] bg-white p-4"
          >
            <h3 className="text-sm font-bold text-[#141a16]">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#3c4a54]">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ArchitecturePage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="animate-fade-up">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
              Architecture note
            </span>
            <span className="rounded-full border border-[#d9c3b8] bg-[#f7e8e0] px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[#8a3315]">
              optional
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141a16]">
            Design choices, trade-offs & what&apos;s next
          </h1>
          <p className="mt-3 text-[#3c4a54]">
            A one-page look under the hood — why the app is built the way it is,
            the compromises made in a 48-hour window, and where it would go next.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={REPO_FILE}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
            >
              View ARCHITECTURE.md on GitHub ↗
            </a>
            <Link
              href="/"
              className="rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        <Section eyebrow="Design choices" items={CHOICES} />
        <Section eyebrow="Trade-offs" items={TRADEOFFS} />

        {/* What's next */}
        <section className="mt-10">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0a5346]">
            What I&apos;d build next
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {NEXT.map((n) => (
              <li
                key={n.title}
                className={`rounded-xl border p-4 ${
                  n.starred
                    ? "border-[#e3c9bd] bg-[#f9ede5]"
                    : "border-[#d9dfd8] bg-white"
                }`}
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#141a16]">
                  {n.starred && (
                    <span className="text-[#b7451e]" aria-hidden="true">
                      ★
                    </span>
                  )}
                  {n.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#3c4a54]">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex justify-center">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0e7a63] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346]"
          >
            Try the app →
          </Link>
        </div>
      </div>
    </main>
  );
}
