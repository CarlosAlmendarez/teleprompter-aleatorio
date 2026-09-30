"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { scheduleClicks } from "@/lib/audio/click";

const PREF_KEY = "player:countIn";
const PREF_EVENT = "player-countin-change";

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribePref(onChange: () => void) {
  window.addEventListener(PREF_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREF_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Whether to count in before playing — a per-device preference. */
export function useCountInPref(): [boolean, (on: boolean) => void] {
  const enabled = useSyncExternalStore(subscribePref, readPref, () => false);
  const set = useCallback((on: boolean) => {
    try {
      localStorage.setItem(PREF_KEY, on ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(PREF_EVENT));
  }, []);
  return [enabled, set];
}

/**
 * Runs a count-in: shows `beats` numbers `intervalMs` apart (optionally with
 * metronome clicks), then calls `onDone`. `count` is the number on screen, or
 * null when idle; `cancel` aborts a count in progress.
 */
export function useCountIn() {
  const [count, setCountState] = useState<number | null>(null);
  // Mirrors `count` for handlers created before the latest render.
  const countRef = useRef<number | null>(null);
  const setCount = useCallback((value: number | null) => {
    countRef.current = value;
    setCountState(value);
  }, []);
  const isCounting = useCallback(() => countRef.current !== null, []);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const stopClicks = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopClicks.current?.();
    stopClicks.current = null;
    setCount(null);
  }, [setCount]);

  const start = useCallback(
    (beats: number, intervalMs: number, onDone: () => void, { clicks = false } = {}) => {
      cancel();
      if (clicks) stopClicks.current = scheduleClicks(beats, intervalMs / 1000);
      // Numbers count down 3-2-1 for a plain count-in, up 1-2-3-4 for a bar.
      const label = (i: number) => (clicks ? i + 1 : beats - i);
      setCount(label(0));
      for (let i = 1; i < beats; i++) {
        timers.current.push(setTimeout(() => setCount(label(i)), i * intervalMs));
      }
      timers.current.push(
        setTimeout(() => {
          timers.current = [];
          stopClicks.current = null;
          setCount(null);
          onDone();
        }, beats * intervalMs),
      );
    },
    [cancel, setCount],
  );

  useEffect(() => cancel, [cancel]);

  return { count, counting: count !== null, isCounting, start, cancel };
}

/** Big centred number over the player while counting in. */
export function CountInOverlay({ count }: { count: number | null }) {
  if (count === null) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div
        key={count}
        className="animate-fade-up flex h-40 w-40 items-center justify-center rounded-full bg-emerald-500/90 text-8xl font-bold tabular-nums text-black shadow-2xl"
      >
        {count}
      </div>
    </div>
  );
}

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

/** Toolbar switch for the count-in preference. */
export function CountInToggle({ label = "Cuenta atrás" }: { label?: string }) {
  const [enabled, setEnabled] = useCountInPref();
  return (
    <button
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      title={enabled ? "Desactivar la cuenta antes de empezar" : "Contar antes de empezar"}
      className={`${BUTTON_CLASS} ${enabled ? "!border-emerald-500 !bg-emerald-500/15" : ""}`}
    >
      ⏱ {label}
      {enabled ? " ✓" : ""}
    </button>
  );
}
