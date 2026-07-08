import Improver from "@/components/Improver";

export default function ImprovePage() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          Content improver
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--body)]">
          Paste existing copy, choose a goal, and get a refined version plus a
          short explanation of what changed.
        </p>
      </div>
      <Improver />
    </div>
  );
}
