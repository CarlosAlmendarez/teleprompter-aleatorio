import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const MIN_SPEED = 5;
const MAX_SPEED = 200;
const SPEED_STEP = 5;

export type PrompterMode = "auto" | "manual";

/**
 * Owns the teleprompter scroll loop. Speed and scrollTop never touch React
 * state — the rAF loop reads/writes the DOM and a plain ref directly, so
 * dragging the speed slider or ticking frames never re-renders this tree.
 * Only rare, discrete UI state (mode/playing/mirror) is React state.
 */
export function usePrompterEngine(viewportRef: RefObject<HTMLDivElement | null>) {
  const [mode, setModeState] = useState<PrompterMode>("auto");
  const [playing, setPlayingState] = useState(true);
  const [mirror, setMirror] = useState(false);

  const speedRef = useRef(40); // px/sec
  const rafId = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  // Held in a ref (not useCallback) so the loop can call itself recursively
  // without the self-reference tripping React Compiler's lint analysis. Set
  // once on mount in an effect — refs are stable, so the closure never goes stale.
  const stepRef = useRef<(ts: number) => void>(() => {});
  useEffect(() => {
    stepRef.current = (ts: number) => {
      if (lastTs.current === null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop += speedRef.current * dt;
      rafId.current = requestAnimationFrame(stepRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAuto = useCallback(() => {
    if (rafId.current !== null) return;
    lastTs.current = null;
    rafId.current = requestAnimationFrame(stepRef.current);
  }, []);

  const stopAuto = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const setPlaying = useCallback(
    (next: boolean) => {
      setPlayingState(next);
      if (mode === "auto") {
        if (next) startAuto();
        else stopAuto();
      }
    },
    [mode, startAuto, stopAuto],
  );

  const setMode = useCallback(
    (next: PrompterMode) => {
      setModeState(next);
      if (next === "auto" && playing) startAuto();
      else stopAuto();
    },
    [playing, startAuto, stopAuto],
  );

  const reset = useCallback(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [viewportRef]);

  const nudge = useCallback(
    (deltaPx: number) => {
      if (viewportRef.current) viewportRef.current.scrollTop += deltaPx;
    },
    [viewportRef],
  );

  const changeSpeed = useCallback((deltaPxPerSec: number) => {
    speedRef.current = Math.min(
      MAX_SPEED,
      Math.max(MIN_SPEED, speedRef.current + deltaPxPerSec),
    );
  }, []);

  const setSpeed = useCallback((value: number) => {
    speedRef.current = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }, []);

  // Stop the loop on unmount only — start/stop otherwise driven by user actions.
  useEffect(() => stopAuto, [stopAuto]);

  return {
    mode,
    playing,
    mirror,
    setMirror,
    setMode,
    setPlaying,
    reset,
    nudge,
    changeSpeed,
    setSpeed,
    speedRef,
    minSpeed: MIN_SPEED,
    maxSpeed: MAX_SPEED,
    speedStep: SPEED_STEP,
  };
}
