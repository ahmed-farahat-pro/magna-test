"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "@/lib/toast";

type Overview = {
  users: number;
  anonymousSessions: number;
  totalActions: number;
  textRequests: number;
  imageRequests: number;
  improveRequests: number;
  brandVoices: number;
  generationsStored: number;
  imagesStored: number;
  logins: number;
  signups: number;
};
type Stats = {
  overview: Overview;
  totalsByType: Record<string, number>;
  actionsByActor: { user: number; anon: number };
  perDay: { day: string; users: number; anon: number; count: number }[];
  recent: {
    id: string;
    type: string;
    isUser: boolean;
    actor: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }[];
};
type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  generations: number;
  actions: number;
};

const TYPE_LABEL: Record<string, string> = {
  session_start: "Anonymous session",
  text_generate: "Text generation",
  image_generate: "Image generation",
  improve: "Improve",
  enforce_voice: "Voice enforce",
  brand_voice_create: "Brand voice",
  signup: "Signup",
  login: "Login",
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Landing-page illustration video
  const [videoInput, setVideoInput] = useState("");
  const [videoEmbed, setVideoEmbed] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoNote, setVideoNote] = useState<string | null>(null);

  const loadVideo = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/video", { cache: "no-store" });
      if (r.status === 401) return;
      const j = await r.json();
      setVideoInput(j?.url ?? "");
      setVideoEmbed(j?.embedUrl ?? null);
    } catch {
      /* non-fatal */
    }
  }, []);

  async function saveVideo(clear = false) {
    setVideoBusy(true);
    setVideoNote(null);
    try {
      const r = await fetch("/api/admin/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clear ? "" : videoInput }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!r.ok) {
        setVideoNote(j?.error?.message ?? "Could not save.");
        return;
      }
      setVideoInput(j?.url ?? "");
      setVideoEmbed(j?.embedUrl ?? null);
      setVideoNote(clear ? "Cleared — the landing page shows “No videos found”." : j?.embedUrl ? "Saved — it's live on the landing page." : "Saved.");
    } catch {
      setVideoNote("Network error.");
    } finally {
      setVideoBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);
      if (s.status === 401 || u.status === 401) {
        router.push("/admin/login");
        return;
      }
      const sj = await s.json();
      const uj = await u.json();
      if (!s.ok) throw new Error(sj?.error?.message ?? "Failed to load stats");
      setStats(sj);
      setUsers(uj?.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    loadVideo();
  }, [load, loadVideo]);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  }

  async function deleteUser(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        setUsers((prev) => (prev ? prev.filter((u) => u.id !== id) : prev));
        setConfirmId(null);
        toast.success("User deleted");
        load();
      } else {
        toast.error("Could not delete the user.");
      }
    } catch {
      toast.error("Network error while deleting the user.");
    } finally {
      setDeleting(null);
    }
  }

  const ov = stats?.overview;

  // Build a continuous 14-day axis (so a single active day isn't one huge bar),
  // each day split into registered-user vs anonymous activity.
  const byDay = new Map((stats?.perDay ?? []).map((d) => [d.day, d]));
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() - (13 - i));
    const key = dt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    return { day: key, users: row?.users ?? 0, anon: row?.anon ?? 0, count: row?.count ?? 0 };
  });
  const maxDay = Math.max(1, ...days14.map((d) => d.count));

  return (
    <main className="flex-1 bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--rust)]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rust)]">
                Admin
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
              Traffic &amp; usage
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-[var(--rust)] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--rust)]"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-[var(--rust-border)] bg-[var(--rust-tint)] px-3 py-2 text-sm text-[var(--rust)]">
            {error}
          </p>
        )}

        {/* landing video for illustration */}
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[var(--ink)]">
                Video for illustration
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Paste a YouTube link — it shows on the landing page. Clear it and the
                landing page shows “No videos found”.
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.06em] ${
                videoEmbed
                  ? "border border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {videoEmbed ? "live" : "no video"}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => saveVideo(false)}
                disabled={videoBusy || !videoInput.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {videoBusy ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => saveVideo(true)}
                disabled={videoBusy || !videoEmbed}
                className="rounded-lg border border-[var(--rust-border)] px-3.5 py-2.5 text-sm font-medium text-[var(--rust)] transition-colors hover:bg-[var(--rust-tint)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>
          {videoNote && (
            <p className="mt-2 text-xs text-[var(--accent-strong)]">{videoNote}</p>
          )}
          {videoEmbed && (
            <div className="mt-3 aspect-video w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <iframe
                className="h-full w-full"
                src={videoEmbed}
                title="Landing video preview"
                loading="lazy"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* overview cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {([
            { label: "Registered users", value: ov?.users, accent: true },
            { label: "Anonymous sessions", value: ov?.anonymousSessions },
            { label: "Total actions", value: ov?.totalActions },
            { label: "Text requests", value: ov?.textRequests },
            { label: "Image requests", value: ov?.imageRequests },
            { label: "Improvements", value: ov?.improveRequests },
            { label: "Brand voices", value: ov?.brandVoices },
            {
              label: "New sign-ups",
              value: ov?.signups,
              sub: ov ? `${ov.logins} returning ${ov.logins === 1 ? "login" : "logins"}` : undefined,
            },
          ] as { label: string; value?: number; accent?: boolean; sub?: string }[]).map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border bg-[var(--surface)] p-4 shadow-sm ${
                c.accent ? "border-[var(--accent)]/40" : "border-[var(--border)]"
              }`}
            >
              <div className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted-2)]">
                {c.label}
              </div>
              {loading && c.value === undefined ? (
                <Skeleton className="mt-2 h-7 w-14 rounded-md" />
              ) : (
                <div className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--ink)]">
                  {c.value ?? 0}
                </div>
              )}
              {c.sub && (
                <div className="mt-0.5 text-[0.7rem] text-[var(--muted)]">{c.sub}</div>
              )}
            </div>
          ))}
        </div>

        {/* activity chart + actor split */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--ink)]">Activity — last 14 days</h2>
              <div className="flex items-center gap-3 text-xs text-[var(--body)]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" /> Registered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--rust-2)]" /> Anonymous
                </span>
              </div>
            </div>
            <div className="mt-4 flex h-36 items-end gap-1.5">
              {days14.map((d) => (
                <div
                  key={d.day}
                  className="group flex h-full flex-1 flex-col items-center justify-end"
                  title={`${d.day} — ${d.users} registered, ${d.anon} anonymous`}
                >
                  {d.count > 0 && (
                    <span className="mb-0.5 font-mono text-[0.58rem] tabular-nums text-[var(--muted)]">
                      {d.count}
                    </span>
                  )}
                  {/* stacked column: registered (bottom) + anonymous (top) */}
                  <div
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t"
                    style={{ height: `${Math.max(d.count ? 4 : 1, (d.count / maxDay) * 100)}%` }}
                  >
                    {d.anon > 0 && (
                      <div
                        className="w-full bg-[var(--rust-2)] transition-all"
                        style={{ height: `${(d.anon / Math.max(1, d.count)) * 100}%` }}
                      />
                    )}
                    {d.users > 0 && (
                      <div
                        className="w-full bg-[var(--accent)] transition-all"
                        style={{ height: `${(d.users / Math.max(1, d.count)) * 100}%` }}
                      />
                    )}
                    {d.count === 0 && (
                      <div className="h-full w-full rounded-t bg-[var(--border-2)]" />
                    )}
                  </div>
                  <span className="mt-1 font-mono text-[0.5rem] text-[var(--muted)]">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--ink)]">Who&apos;s acting</h2>
            <ActorSplit
              user={stats?.actionsByActor.user ?? 0}
              anon={stats?.actionsByActor.anon ?? 0}
            />
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted-2)]">
              By action type
            </h3>
            <ul className="mt-2 space-y-1.5">
              {Object.entries(stats?.totalsByType ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <li key={type} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--body)]">{TYPE_LABEL[type] ?? type}</span>
                    <span className="font-mono tabular-nums text-[var(--ink)]">{n}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* users table */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border-2)] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[var(--ink)]">
              Users {users ? `(${users.length})` : ""}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-2)] font-mono text-[0.62rem] uppercase tracking-[0.06em] text-[var(--muted-2)]">
                  <th className="px-5 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Joined</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Content</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-[var(--muted)]">
                      {loading ? "Loading…" : "No registered users yet."}
                    </td>
                  </tr>
                )}
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border-2)] last:border-0">
                    <td className="max-w-[220px] truncate px-5 py-3 font-medium text-[var(--ink)]" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-3 text-[var(--body)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--body)]">
                      {u.generations}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--body)]">
                      {u.actions}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {confirmId === u.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={deleting === u.id}
                            className="rounded-md bg-[var(--danger)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--danger-strong)] disabled:opacity-50"
                          >
                            {deleting === u.id ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--body)] hover:bg-[var(--surface-2)]"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(u.id)}
                          className="rounded-md border border-[var(--rust-border)] px-2.5 py-1 text-xs font-medium text-[var(--rust)] hover:bg-[var(--rust-tint)]"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* recent activity feed */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border-2)] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[var(--ink)]">Recent activity</h2>
          </div>
          <ul className="divide-y divide-[var(--border-2)]">
            {(stats?.recent ?? []).length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-[var(--muted)]">Nothing yet.</li>
            )}
            {(stats?.recent ?? []).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    e.isUser ? "bg-[var(--accent)]" : "bg-[var(--rust-2)]"
                  }`}
                  title={e.isUser ? "registered user" : "anonymous"}
                />
                <span className="font-medium text-[var(--ink)]">
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <span className="truncate font-mono text-xs text-[var(--muted)]">
                    {Object.entries(e.meta)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </span>
                )}
                <span className="ml-auto shrink-0 font-mono text-xs text-[var(--muted)]">
                  {e.isUser ? "user" : "anon"}·{e.actor} · {timeAgo(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

function ActorSplit({ user, anon }: { user: number; anon: number }) {
  const total = Math.max(1, user + anon);
  const userPct = Math.round((user / total) * 100);
  return (
    <div className="mt-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--border-2)]">
        <div className="bg-[var(--accent)]" style={{ width: `${userPct}%` }} />
        <div className="bg-[var(--rust-2)]" style={{ width: `${100 - userPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[var(--body)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" /> Registered {user}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--body)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--rust-2)]" /> Anonymous {anon}
        </span>
      </div>
    </div>
  );
}
