"use client";

import { useEffect, useState } from "react";
import { formatClock, paceDelta, parseClock } from "@/lib/player/timing";

/**
 * Bottom-left pill: time elapsed while playing, time left at the current
 * speed and, with a target duration, how far ahead or behind the reader is.
 * Click it to set the target or restart the clock.
 */
export function SessionTimer({
  playing,
  position,
  remainingSec,
  targetSec,
  onTargetChange,
}: {
  playing: boolean;
  position: number;
  remainingSec: number | null;
  targetSec: number | null;
  /** Omitted where the target can't be edited (the reader window). */
  onTargetChange?: (seconds: number | null) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!playing) return;
    const started = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => clearInterval(id);
    // Restart only on play/pause; `elapsed` seeds the new run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Pace only means something once the clock has started.
  const delta = targetSec && elapsed >= 1 ? paceDelta(position, elapsed, targetSec) : null;
  const deltaTone =
    delta === null ? "" : Math.abs(delta) < 10 ? "text-emerald-600 dark:text-emerald-400" : delta > 0 ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400";

  function commit() {
    const value = draft.trim() === "" ? null : parseClock(draft);
    if (draft.trim() !== "" && value === null) return;
    onTargetChange?.(value);
    setEditing(false);
  }

  return (
    <div className="fixed bottom-3 left-3 z-20 flex flex-col items-start gap-2">
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/95 p-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/95"
        >
          {onTargetChange && (
            <label className="flex items-center gap-1.5">
              Duración objetivo
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="m:ss"
                className="w-16 rounded-md border border-black/10 bg-transparent px-1.5 py-1 tabular-nums outline-none focus:border-emerald-500 dark:border-white/15"
              />
            </label>
          )}
          {onTargetChange && (
            <button type="submit" className="rounded-md bg-emerald-500 px-2 py-1 font-medium text-black">
              Guardar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setElapsed(0);
              setEditing(false);
            }}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/15"
          >
            Reiniciar reloj
          </button>
        </form>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDraft(targetSec ? formatClock(targetSec) : "");
          setEditing((v) => !v);
        }}
        title="Cronómetro — clic para fijar una duración objetivo"
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-xs tabular-nums text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/85 dark:text-zinc-300"
      >
        <span>⏱ {formatClock(elapsed)}</span>
        {remainingSec !== null && <span className="text-zinc-400">· quedan {formatClock(remainingSec)}</span>}
        {targetSec && delta !== null && (
          <span className={deltaTone}>
            · {Math.abs(delta) < 10 ? "a tiempo" : `${formatClock(Math.abs(delta))} ${delta > 0 ? "adelantado" : "atrasado"}`}
          </span>
        )}
      </button>
    </div>
  );
}
