// Shared skeleton primitives — a shimmering placeholder while content loads, so
// the UI never snaps from empty to full. Themed via tokens; the `.shimmer` sweep
// lives in globals.css.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded bg-[var(--border-2)] ${className}`}
      aria-hidden="true"
    />
  );
}

// A history/content card placeholder.
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// A stat-card placeholder (admin overview).
export function StatSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <Skeleton className="h-2.5 w-20 rounded" />
      <Skeleton className="mt-3 h-7 w-12 rounded-md" />
    </div>
  );
}
