"use client";

import { useCallback, useRef } from "react";

/**
 * Double-submit guard for buttons that call the backend / AI.
 *
 * Returns a `guard(fn)` wrapper that runs `fn` only when no previous invocation
 * is still in flight. The flag is a synchronous `useRef` — not React state — so
 * it closes the gap between a click and the button re-rendering as `disabled`,
 * which is where a rapid double-click (or a script firing `.click()` in a loop)
 * would otherwise slip a second request through.
 *
 * This is the client half of a two-layer defense: the button stops the ordinary
 * double-tap here, and the server's per-session concurrency lock
 * (`@/lib/concurrency`) stops the adversarial case where the client is bypassed.
 *
 * Usage:
 *   const guard = useInFlight();
 *   async function onSubmit(e) {
 *     e.preventDefault();
 *     await guard(async () => { ...existing fetch + state... });
 *   }
 */
export function useInFlight() {
  const busy = useRef(false);
  return useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined; // drop the extra click
    busy.current = true;
    try {
      return await fn();
    } finally {
      busy.current = false;
    }
  }, []);
}
