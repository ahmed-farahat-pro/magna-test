import Link from "next/link";

export const metadata = {
  title: "Fixes & improvements — Nova",
  description:
    "The full remediation log: every fix, hardening pass, and feature added after each independent grading round.",
};

const REPO_FILE =
  "https://github.com/ahmed-farahat-pro/magna-test/blob/main/fixes.md";

type Tag = "security" | "bug" | "feature";
const TAG_CLS: Record<Tag, string> = {
  security: "border-[var(--slate-border)] bg-[var(--slate-tint)] text-[var(--slate)]",
  bug: "border-[var(--rust-border)] bg-[var(--rust-tint)] text-[var(--rust)]",
  feature: "border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-strong)]",
};
const TAG_LABEL: Record<Tag, string> = {
  security: "hardening",
  bug: "bug fix",
  feature: "feature",
};

type Round = {
  n: string;
  title: string;
  tags: Tag[];
  points: string[];
};

const ROUNDS: Round[] = [
  {
    n: "1",
    title: "Post-grade hardening",
    tags: ["security", "feature"],
    points: [
      "SESSION_SECRET fails closed in production (no forgeable default).",
      "/api/img path validation, request body-size guard, array-count enforcement.",
      "The streaming path is guarded against degenerate output; image scene caching; structured request-id logging; accessibility polish.",
    ],
  },
  {
    n: "2",
    title: "Live-path counts, prompt calibration & polish",
    tags: ["bug", "feature"],
    points: [
      "Count enforcement moved onto the live streaming path — which caught and fixed a LinkedIn false-reject regression.",
      "Self-critique steps in the prompts; image “new variation” + richer alt text; hard-worded “avoid” rule; client scene sanitization; legibility & clipboard polish.",
    ],
  },
  {
    n: "3",
    title: "Durability & workflow evidence",
    tags: ["feature"],
    points: [
      "Durable rate limiting via Upstash Redis with an in-memory fallback.",
      "Committed Claude Code workflow artifacts (prompt log + workflow scripts).",
    ],
  },
  {
    n: "4",
    title: "Brand voice — server-side + hard enforcement",
    tags: ["feature"],
    points: [
      "The brand voice is persisted server-side as the source of truth.",
      "Hard “avoid”-word enforcement: detect leaked words + one-click rewrite.",
    ],
  },
  {
    n: "5",
    title: "Multiple brand voices",
    tags: ["feature"],
    points: [
      "Add / edit / delete many voices and pick one per generation.",
      "Trade-offs section pruned as former limitations were closed.",
    ],
  },
  {
    n: "6",
    title: "User authentication",
    tags: ["feature", "security"],
    points: [
      "Email + password accounts (scrypt hash, 7-day HMAC token).",
      "Anonymous work migrates onto the account on signup/login — no user-enumeration, IP-rate-limited.",
    ],
  },
  {
    n: "7",
    title: "Signup validation & cookie consent",
    tags: ["security", "feature"],
    points: [
      "Disposable-email blocking, email-format validation, a password-strength meter.",
      "A dismissible cookie-consent banner (essential cookies only).",
    ],
  },
  {
    n: "8",
    title: "Admin dashboard, tracking & the stale-header fix",
    tags: ["feature", "bug"],
    points: [
      "Header showed “Sign in” after login (cached /api/auth/me) — fixed with no-store + an auth-changed event.",
      "Full activity tracking (ActivityEvent) and an env-configured admin dashboard: traffic, usage-by-type, a 14-day chart, and user management with cascading delete.",
    ],
  },
  {
    n: "9",
    title: "Modern disposable-email hardening",
    tags: ["security"],
    points: [
      "Closed 19 modern temp-mail providers the base list missed (mail.tm, tempmail.plus aliases, 1secmail…).",
      "Curated supplement + parent-domain matching + a brand-token heuristic — 0 false positives on legit domains.",
    ],
  },
  {
    n: "10",
    title: "Mobile responsiveness & the Workflow page",
    tags: ["bug", "feature"],
    points: [
      "Fixed the landing demo scroll-jacking the page on mobile (fixed height + internal scroll).",
      "Rebuilt the nav with a hamburger menu so sign-in is always reachable; added an interactive two-flow Workflow page.",
    ],
  },
];

export default function FixesPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        <div className="animate-fade-up">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            Fixes &amp; improvements
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Every fix, hardening pass &amp; feature — in order
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-[var(--body)]">
            This project was graded by an independent multi-agent panel, then
            iterated on across ten rounds. Here&apos;s the full log — what changed,
            why, and how it was verified. The score moved from 89/100 to 104/110.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={REPO_FILE}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              Read the full fixes.md on GitHub ↗
            </a>
            <Link
              href="/workflow"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              See the workflow →
            </Link>
          </div>
        </div>

        {/* rounds timeline */}
        <ol className="mt-10 flex flex-col gap-4">
          {ROUNDS.map((r, i) => (
            <li
              key={r.n}
              style={{ animationDelay: `${i * 45}ms` }}
              className="animate-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] font-mono text-sm font-bold text-[var(--accent-strong)]">
                  {r.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--ink)]">
                      {r.title}
                    </h2>
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${TAG_CLS[t]}`}
                      >
                        {TAG_LABEL[t]}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {r.points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm leading-relaxed text-[var(--body)]">
                        <span className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true">
                          ✓
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
          >
            Try the app →
          </Link>
        </div>
      </div>
    </main>
  );
}
