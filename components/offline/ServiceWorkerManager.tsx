"use client";

import { useEffect } from "react";
import { syncOfflineContent } from "@/lib/offline/client";

/**
 * Registers /sw.js (production builds only — in dev it would cache stale
 * bundles) and, for signed-in users, refreshes their offline content in the
 * background at most every few minutes.
 */
export function ServiceWorkerManager({ signedIn = false }: { signedIn?: boolean }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        if (signedIn && navigator.onLine) void syncOfflineContent({ force: false });
      })
      .catch(() => {});
  }, [signedIn]);

  return null;
}
