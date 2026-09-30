"use client";

import { formatShift, prettyAccidentals, transposeKey } from "@/lib/music/transpose";

const BUTTON =
  "rounded-lg border border-black/15 bg-black/5 px-2.5 py-1.5 text-sm leading-none dark:border-white/15 dark:bg-white/5";

/**
 * Key (semitone) and capo controls for the players. Shows the key the song
 * sounds in and, with a capo, the chord shapes actually played.
 */
export function TransposeControl({
  transpose,
  capo,
  songKey,
  onChange,
}: {
  transpose: number;
  capo: number;
  songKey: string | null;
  onChange: (next: { transpose: number; capo: number }) => void;
}) {
  const shift = (delta: number) => {
    // Stay within one octave either way: -11..11.
    const next = Math.max(-11, Math.min(11, transpose + delta));
    if (next !== transpose) onChange({ transpose: next, capo });
  };
  const sounding = songKey ? prettyAccidentals(transposeKey(songKey, transpose)) : null;
  const shapes = songKey && capo > 0 ? prettyAccidentals(transposeKey(songKey, transpose - capo)) : null;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Tono y cejilla">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Tono</span>
      <button onClick={() => shift(-1)} className={BUTTON} aria-label="Bajar un semitono" disabled={transpose <= -11}>
        −
      </button>
      <button
        onClick={() => onChange({ transpose: 0, capo })}
        title="Volver al tono original"
        className="min-w-16 rounded-lg px-2 py-1.5 text-center text-sm font-semibold tabular-nums hover:bg-black/5 dark:hover:bg-white/10"
      >
        {formatShift(transpose)}
        {sounding && <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">· {sounding}</span>}
      </button>
      <button onClick={() => shift(1)} className={BUTTON} aria-label="Subir un semitono" disabled={transpose >= 11}>
        +
      </button>
      <label className="ml-2 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Cejilla
        <select
          value={capo}
          onChange={(e) => onChange({ transpose, capo: Number(e.target.value) })}
          className="rounded-lg border border-black/15 bg-black/5 px-1.5 py-1 text-sm text-zinc-900 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {Array.from({ length: 12 }, (_, n) => (
            <option key={n} value={n}>
              {n === 0 ? "—" : n}
            </option>
          ))}
        </select>
      </label>
      {shapes && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400" title="Acordes que se tocan con la cejilla puesta">
          forma {shapes}
        </span>
      )}
    </div>
  );
}
