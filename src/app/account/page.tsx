"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { passwordStrength } from "@/lib/passwordStrength";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(password);
  const emailOk = EMAIL_RE.test(email);
  // On signup, require a valid email and at least a medium-strength password.
  const blockedOnSignup =
    mode === "signup" && (!emailOk || strength.label === "weak");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && strength.label === "weak") {
      setError("Choose a stronger password (at least medium).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      // Signed in — tell the header to re-check auth immediately, then go.
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/create");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
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
      <div className="mx-auto w-full max-w-md px-6 py-14">
        <div className="animate-fade-up rounded-xl border border-[#d9dfd8] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-[#141a16]">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-[#3c4a54]">
            {mode === "signup"
              ? "Sign up to keep your content across devices. Anything you made anonymously moves to your account."
              : "Sign in to access your saved content and brand voices."}
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
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
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls}
              />
              {mode === "signup" && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3].map((i) => {
                      const filled =
                        strength.label === "weak"
                          ? i === 1
                          : strength.label === "medium"
                            ? i <= 2
                            : true;
                      const color =
                        strength.label === "weak"
                          ? "bg-[#a62a2a]"
                          : strength.label === "medium"
                            ? "bg-[#b7451e]"
                            : "bg-[#0e7a63]";
                      return (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded ${filled ? color : "bg-[#e7ebe6]"}`}
                        />
                      );
                    })}
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      strength.label === "weak"
                        ? "text-[#a62a2a]"
                        : strength.label === "medium"
                          ? "text-[#8a3315]"
                          : "text-[#0a5346]"
                    }`}
                    aria-live="polite"
                  >
                    Strength: <span className="font-semibold capitalize">{strength.label}</span>{" "}
                    — {strength.hint}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-[#e7c9c0] bg-[#f7e8e0] px-3 py-2 text-sm text-[#8a3315]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || blockedOnSignup}
              className="mt-1 rounded-lg bg-[#0e7a63] px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#5f6960]">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
              }}
              className="font-semibold text-[#0a5346] hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[#5f6960]">
          Or keep{" "}
          <Link href="/create" className="text-[#0a5346] hover:underline">
            using it anonymously
          </Link>{" "}
          — no account needed.
        </p>
      </div>
    </main>
  );
}
