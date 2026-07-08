import Generator from "@/components/Generator";

export default function CreatePage() {
  return (
    <div className="flex-1">
      <div className="animate-fade-up mx-auto max-w-6xl px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          Content generator
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--body)]">
          Generate polished, ready-to-use marketing content — each format written
          with its own prompt strategy, powered by Claude — then pair it with a
          matching AI image in one click.
        </p>
      </div>

      <Generator />
    </div>
  );
}
