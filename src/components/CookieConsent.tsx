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
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="animate-fade-up fixed inset-x-0 bottom-0 z-50 border-t border-[#d9dfd8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-4 sm:flex-row sm:items-center">
        <p className="text-sm leading-relaxed text-[#3c4a54]">
          We use <span className="font-semibold">essential cookies</span> to keep
          you signed in and remember your session. No tracking, no ads.
        </p>
        <div className="ml-auto flex shrink-0 gap-2">
          <button
            onClick={() => decide("declined")}
            className="rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]"
          >
            Decline
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-lg bg-[#0e7a63] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
