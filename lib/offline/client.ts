"use client";

import type { OfflineManifest } from "./types";

export type SyncResult = { ok: boolean; failed?: string[]; pages?: number; pdfs?: number; error?: string };
export type StoredManifest = OfflineManifest & { syncedAt: string | null };

const SYNC_THROTTLE_MS = 10 * 60 * 1000;
const LAST_SYNC_KEY = "offline:lastSync";

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** Sends a message to the active service worker and awaits its reply. */
async function ask<T>(message: object): Promise<T | null> {
  if (!serviceWorkerSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const worker = registration?.active;
  if (!worker) return null;
  return new Promise<T>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => resolve(e.data as T);
    worker.postMessage(message, [channel.port2]);
  });
}

/**
 * Downloads everything the user marked "available offline" onto this device.
 * With `force: false` it skips if a sync ran in the last few minutes.
 */
export async function syncOfflineContent({ force = true } = {}): Promise<SyncResult | null> {
  if (!serviceWorkerSupported()) return null;
  if (!force) {
    try {
      const last = Number(localStorage.getItem(LAST_SYNC_KEY) ?? 0);
      if (Date.now() - last < SYNC_THROTTLE_MS) return null;
    } catch {}
  }
  await navigator.serviceWorker.ready;
  const res = await fetch("/api/offline");
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const manifest: OfflineManifest = await res.json();
  const result = await ask<SyncResult>({ type: "sync", ...manifest });
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {}
  return result;
}

export function listOfflineContent(): Promise<StoredManifest | null> {
  return ask<StoredManifest>({ type: "list" });
}

/** Removes cached pages/PDFs from this device (e.g. on sign-out). */
export async function clearOfflineContent(): Promise<void> {
  await ask({ type: "clear" });
  try {
    localStorage.removeItem(LAST_SYNC_KEY);
  } catch {}
}
