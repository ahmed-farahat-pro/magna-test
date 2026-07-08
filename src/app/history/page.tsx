import History from "@/components/History";

export default function HistoryPage() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          History
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--body)]">
          Everything you&apos;ve generated and improved this session — with its
          matching image. View, copy, download, or delete.
        </p>
      </div>
      <History />
    </div>
  );
}
