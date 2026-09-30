import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (Screen Wake Lock API). The browser drops
 * the lock whenever the tab is hidden, so it is re-requested on return.
 * Unsupported browsers or a refused request (low battery, no HTTPS) are
 * ignored: the page works as before, the screen may just sleep.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function request() {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Refused — nothing to do.
      }
    }

    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
