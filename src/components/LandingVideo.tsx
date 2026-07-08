"use client";

import { useEffect, useState } from "react";

type VideoState = { loading: boolean; embedUrl: string | null };

export default function LandingVideo() {
  const [state, setState] = useState<VideoState>({ loading: true, embedUrl: null });

  useEffect(() => {
    let alive = true;
    fetch("/api/video", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setState({ loading: false, embedUrl: j?.embedUrl ?? null }))
      .catch(() => alive && setState({ loading: false, embedUrl: null }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            Walkthrough
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            Watch the full illustration
          </h2>
          <p className="mt-3 text-[var(--body)]">
            A guided tour of the app — the workflow, every feature, and how it&apos;s
            built.
          </p>
        </div>

        {/* 16:9 frame — always present; holds the video or a placeholder */}
        <div className="mx-auto mt-8 aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0f1512] shadow-lg">
          {state.loading ? (
            <div className="shimmer flex h-full w-full items-center justify-center bg-[#121814]">
              <span className="font-mono text-xs text-[#7f8c84]">Loading…</span>
            </div>
          ) : state.embedUrl ? (
            <iframe
              className="h-full w-full"
              src={state.embedUrl}
              title="App walkthrough video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2c3a31] bg-[#182019]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 6.5v11l9-5.5-9-5.5Z" stroke="#5a6b60" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="font-mono text-sm font-semibold text-[var(--accent-border)]">No videos found</p>
              <p className="max-w-xs text-xs text-[#6d7c72]">
                A walkthrough video hasn&apos;t been added yet — check back soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
