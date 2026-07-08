"use client";

import { useEffect, useState } from "react";

const KEY = "acms_cookie_consent";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!window.localStorage.getItem(KEY));
    } catch {
      setShow(false);
    }
  }, []);

  function decide(value: "accepted" | "declined") {
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      /* private mode — nothing to persist */
    }
    // Let the app react to the choice immediately. Declining opts out of the
    // anonymous visit counter (TopNav listens); per-action metrics are unaffected.
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="animate-fade-up fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] glass">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-4 sm:flex-row sm:items-center">
        <p className="text-sm leading-relaxed text-[var(--body)]">
          We use <span className="font-semibold">essential cookies</span> to keep
          you signed in and remember your session — no ads, no third parties.{" "}
          <span className="text-[var(--muted-2)]">
            Decline to opt out of the anonymous visit count.
          </span>
        </p>
        <div className="ml-auto flex shrink-0 gap-2">
          <button
            onClick={() => decide("declined")}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Decline
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
