// A compact capability strip shown under the self-running demo, so the onboarding
// represents the WHOLE app — not just the three acts the demo animates. Reveal is
// a one-time staggered fade (no continuous animation → no mobile cost).

const CAPS: { label: string; kind: "core" | "bonus" }[] = [
  { label: "4 formats · own prompt each", kind: "core" },
  { label: "Live token streaming", kind: "core" },
  { label: "Content-aware AI images", kind: "core" },
  { label: "Content improver", kind: "core" },
  { label: "Multiple brand voices", kind: "bonus" },
  { label: "Hard “avoid”-word enforce", kind: "bonus" },
  { label: "Content safety + refusal handling", kind: "bonus" },
  { label: "Accounts + cross-device sync", kind: "core" },
  { label: "Admin dashboard & analytics", kind: "bonus" },
  { label: "Export PDF / Word / txt", kind: "bonus" },
  { label: "Durable rate limiting", kind: "bonus" },
  { label: "Light & dark themes", kind: "bonus" },
];

export default function DemoCapabilities() {
  return (
    <div className="mx-auto mt-8 max-w-4xl text-center">
      <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted-2)]">
        The demo shows three acts — the app does all of this
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {CAPS.map((c, i) => (
          <span
            key={c.label}
            style={{ animationDelay: `${i * 45}ms` }}
            className={`animate-fade-up inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              c.kind === "core"
                ? "border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                : "border-[var(--rust-border)] bg-[var(--rust-tint)] text-[var(--rust)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                c.kind === "core" ? "bg-[var(--accent)]" : "bg-[var(--rust-2)]"
              }`}
              aria-hidden="true"
            />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
