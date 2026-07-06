import Generator from "@/components/Generator";

export default function Home() {
  return (
    <div className="flex-1">
      <header className="border-b border-[#d9dfd8] bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0e7a63]" />
            <span className="font-semibold tracking-tight text-[#141a16]">
              AI Content Marketing Suite
            </span>
          </div>
          <a
            href="/api/health"
            className="font-mono text-xs text-[#5c665e] transition-colors hover:text-[#0a5346]"
          >
            status →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
          Content generator
        </h1>
        <p className="mt-2 max-w-2xl text-[#3c4a54]">
          Generate polished, ready-to-use marketing content — each format written
          with its own prompt strategy, powered by Claude.
        </p>
      </div>

      <Generator />
    </div>
  );
}
