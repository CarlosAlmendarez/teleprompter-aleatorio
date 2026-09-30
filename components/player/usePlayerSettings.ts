import { useCallback, useEffect, useRef } from "react";
import type { PlaybackSettings } from "@/lib/db/schema";
import type { SetlistNav } from "@/lib/setlists/types";
import { toMetadataPatch, toOverridesPatch, type PlayerSettings } from "@/lib/player/settings";

const SAVE_DELAY_MS = 1000;

/**
 * Remembers player settings. Outside a setlist they go to the document
 * (`metadata.playback`, `transpose`, `capo`); while a setlist plays they go to
 * that step's overrides, so each song keeps its own key and speed there.
 * Changes are batched and flushed after a pause, and always on leaving.
 */
export function usePlayerSettings({
  documentId,
  playback,
  setlistNav,
}: {
  documentId: string;
  playback: PlaybackSettings | undefined;
  setlistNav: SetlistNav | null;
}) {
  const pending = useRef<PlayerSettings>({});
  const playbackRef = useRef<PlaybackSettings>(playback ?? {});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const change = pending.current;
    pending.current = {};
    if (Object.keys(change).length === 0) return;

    const nav = setlistNav;
    let url: string;
    let body: unknown;
    if (nav) {
      const overrides = toOverridesPatch(change);
      if (Object.keys(overrides).length === 0) return;
      url = `/api/setlists/${nav.setlistId}/items/${nav.itemId}`;
      body = { overrides };
    } else {
      const { patch, playback: next } = toMetadataPatch(change, playbackRef.current);
      playbackRef.current = next;
      url = `/api/documents/${documentId}`;
      body = { metadata: patch };
    }
    void fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, [documentId, setlistNav]);

  const save = useCallback(
    (change: PlayerSettings) => {
      pending.current = { ...pending.current, ...change };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  return { save, flush };
}
