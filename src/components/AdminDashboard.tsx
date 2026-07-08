"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  perDay: { day: string; count: number }[];
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
  }, [load]);

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
        load();
      }
    } finally {
      setDeleting(null);
    }
  }

  const ov = stats?.overview;
  const maxDay = Math.max(1, ...(stats?.perDay ?? []).map((d) => d.count));

  return (
    <main className="flex-1 bg-[#eff2ee]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8a3315]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#8a3315]">
                Admin
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#141a16]">
              Traffic &amp; usage
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-[#8a3315] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f2810]"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-[#e7c9c0] bg-[#f7e8e0] px-3 py-2 text-sm text-[#8a3315]">
            {error}
          </p>
        )}

        {/* overview cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Registered users", value: ov?.users, accent: true },
            { label: "Anonymous sessions", value: ov?.anonymousSessions },
            { label: "Total actions", value: ov?.totalActions },
            { label: "Text requests", value: ov?.textRequests },
            { label: "Image requests", value: ov?.imageRequests },
            { label: "Improvements", value: ov?.improveRequests },
            { label: "Brand voices", value: ov?.brandVoices },
            { label: "Logins / signups", value: ov ? `${ov.logins} / ${ov.signups}` : undefined },
          ].map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                c.accent ? "border-[#0e7a63]/40" : "border-[#d9dfd8]"
              }`}
            >
              <div className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#5c665e]">
                {c.label}
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-[#141a16]">
                {c.value ?? (loading ? "…" : 0)}
              </div>
            </div>
          ))}
        </div>

        {/* activity chart + actor split */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[#d9dfd8] bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-[#141a16]">Activity — last 14 days</h2>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {(stats?.perDay ?? []).length === 0 && (
                <p className="text-sm text-[#5f6960]">No activity yet.</p>
              )}
              {(stats?.perDay ?? []).map((d) => (
                <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-0.5 font-mono text-[0.6rem] tabular-nums text-[#5f6960]">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-[#0e7a63] transition-all group-hover:bg-[#0a5346]"
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="mt-1 font-mono text-[0.55rem] text-[#5f6960]">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#d9dfd8] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#141a16]">Who&apos;s acting</h2>
            <ActorSplit
              user={stats?.actionsByActor.user ?? 0}
              anon={stats?.actionsByActor.anon ?? 0}
            />
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.06em] text-[#5c665e]">
              By action type
            </h3>
            <ul className="mt-2 space-y-1.5">
              {Object.entries(stats?.totalsByType ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <li key={type} className="flex items-center justify-between text-sm">
                    <span className="text-[#3c4a54]">{TYPE_LABEL[type] ?? type}</span>
                    <span className="font-mono tabular-nums text-[#141a16]">{n}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* users table */}
        <div className="mt-6 rounded-xl border border-[#d9dfd8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e7ebe6] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[#141a16]">
              Users {users ? `(${users.length})` : ""}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7ebe6] font-mono text-[0.62rem] uppercase tracking-[0.06em] text-[#5c665e]">
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
                    <td colSpan={5} className="px-5 py-6 text-center text-[#5f6960]">
                      {loading ? "Loading…" : "No registered users yet."}
                    </td>
                  </tr>
                )}
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-[#f0f2ef] last:border-0">
                    <td className="max-w-[220px] truncate px-5 py-3 font-medium text-[#141a16]" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-3 text-[#3c4a54]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-[#3c4a54]">
                      {u.generations}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-[#3c4a54]">
                      {u.actions}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {confirmId === u.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={deleting === u.id}
                            className="rounded-md bg-[#a62a2a] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#872020] disabled:opacity-50"
                          >
                            {deleting === u.id ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-md border border-[#d9dfd8] px-2.5 py-1 text-xs text-[#3c4a54] hover:bg-[#f4f6f3]"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(u.id)}
                          className="rounded-md border border-[#e7c9c0] px-2.5 py-1 text-xs font-medium text-[#8a3315] hover:bg-[#f7e8e0]"
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
        <div className="mt-6 rounded-xl border border-[#d9dfd8] bg-white shadow-sm">
          <div className="border-b border-[#e7ebe6] px-5 py-3.5">
            <h2 className="text-sm font-bold text-[#141a16]">Recent activity</h2>
          </div>
          <ul className="divide-y divide-[#f0f2ef]">
            {(stats?.recent ?? []).length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-[#5f6960]">Nothing yet.</li>
            )}
            {(stats?.recent ?? []).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    e.isUser ? "bg-[#0e7a63]" : "bg-[#b7451e]"
                  }`}
                  title={e.isUser ? "registered user" : "anonymous"}
                />
                <span className="font-medium text-[#141a16]">
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <span className="truncate font-mono text-xs text-[#5f6960]">
                    {Object.entries(e.meta)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </span>
                )}
                <span className="ml-auto shrink-0 font-mono text-xs text-[#5f6960]">
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
      <div className="flex h-3 overflow-hidden rounded-full bg-[#e7ebe6]">
        <div className="bg-[#0e7a63]" style={{ width: `${userPct}%` }} />
        <div className="bg-[#b7451e]" style={{ width: `${100 - userPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[#3c4a54]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0e7a63]" /> Users {user}
        </span>
        <span className="flex items-center gap-1.5 text-[#3c4a54]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#b7451e]" /> Anonymous {anon}
        </span>
      </div>
    </div>
  );
}
