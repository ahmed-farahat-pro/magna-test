"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Sign-in failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2.5 text-sm text-[#141a16] outline-none transition-colors placeholder:text-[#5f6960] focus:border-[#0e7a63] focus:ring-2 focus:ring-[#0e7a63]/15";
  const labelCls =
    "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#5c665e]";

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-sm px-6 py-16">
        <div className="animate-fade-up rounded-xl border border-[#d9dfd8] bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8a3315]" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#8a3315]">
              Admin
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[#141a16]">
            Operator sign-in
          </h1>
          <p className="mt-1.5 text-sm text-[#3c4a54]">
            Restricted area — traffic, usage, and user management.
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </div>
            {error && (
              <p className="rounded-lg border border-[#e7c9c0] bg-[#f7e8e0] px-3 py-2 text-sm text-[#8a3315]" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg bg-[#8a3315] px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#6f2810] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
