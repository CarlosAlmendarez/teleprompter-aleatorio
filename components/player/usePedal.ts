import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  DEFAULT_PEDAL_CONFIG,
  actionForKey,
  loadPedalConfig,
  subscribePedalConfig,
  type PedalAction,
  type PedalConfig,
} from "@/lib/player/pedal";

// Cached snapshot so useSyncExternalStore sees a stable object between changes.
let cached: { raw: string; config: PedalConfig } | null = null;
function snapshot(): PedalConfig {
  let raw = "";
  try {
    raw = localStorage.getItem("pedal:config") ?? "";
  } catch {}
  if (!cached || cached.raw !== raw) cached = { raw, config: loadPedalConfig() };
  return cached.config;
}

export function usePedalConfig(): PedalConfig {
  return useSyncExternalStore(subscribePedalConfig, snapshot, () => DEFAULT_PEDAL_CONFIG);
}

/**
 * Routes pedal presses to player actions. Listens in the capture phase and
 * stops the event, so while the pedal mode is on a bound key does only the
 * pedal action (not also the player's own shortcut for that key).
 */
export function usePedal(handlers: Partial<Record<PedalAction, () => void>>) {
  const config = usePedalConfig();
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!config.enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, dialog")) return;
      const action = actionForKey(config.bindings, e.code || e.key);
      const handler = action ? handlersRef.current[action] : undefined;
      if (!handler) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) handler();
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [config]);

  return config;
}
