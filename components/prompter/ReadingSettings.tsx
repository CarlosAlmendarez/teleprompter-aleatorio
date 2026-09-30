"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  DEFAULT_READING,
  READING_FONTS,
  READING_THEMES,
  readingSnapshot,
  saveReading,
  subscribeReading,
  type ReadingFont,
  type ReadingPrefs,
  type ReadingTheme,
} from "@/lib/player/reading";

export function useReadingPrefs(): ReadingPrefs {
  return useSyncExternalStore(subscribeReading, readingSnapshot, () => DEFAULT_READING);
}

const ROW = "flex items-center justify-between gap-4";
const LABEL = "text-zinc-600 dark:text-zinc-300";

/** Dialog to tune how the script looks on this device. */
export function ReadingSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useReadingPrefs();
  const ref = useRef<HTMLDialogElement>(null);
  // Merge into the latest stored prefs, not this render's copy, so quick
  // successive changes never undo each other.
  const set = (patch: Partial<ReadingPrefs>) => saveReading({ ...readingSnapshot(), ...patch });
  const setGuide = (patch: Partial<ReadingPrefs["guide"]>) => set({ guide: { ...readingSnapshot().guide, ...patch } });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.stopPropagation()}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/30 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex flex-col gap-4 p-6 text-sm">
        <div>
          <h2 className="text-lg font-semibold">Lectura</h2>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Se aplica al momento y se guarda en este dispositivo. El tamaño de letra se guarda por documento.
          </p>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Tipo de letra</span>
          <div className="flex flex-wrap justify-end gap-1">
            {(Object.keys(READING_FONTS) as ReadingFont[]).map((font) => (
              <button
                key={font}
                onClick={() => set({ font })}
                aria-pressed={prefs.font === font}
                style={{ fontFamily: READING_FONTS[font].stack }}
                className={`rounded-lg border px-2.5 py-1 ${
                  prefs.font === font ? "border-emerald-500 bg-emerald-500/10" : "border-black/10 dark:border-white/15"
                }`}
              >
                {READING_FONTS[font].label}
              </button>
            ))}
          </div>
        </div>

        <label className={ROW}>
          <span className={LABEL}>Interlineado · {prefs.lineHeight.toFixed(1)}</span>
          <input
            type="range"
            min={1.1}
            max={2.4}
            step={0.1}
            value={prefs.lineHeight}
            onChange={(e) => set({ lineHeight: Number(e.target.value) })}
            className="w-40 accent-emerald-500"
          />
        </label>

        <label className={ROW}>
          <span className={LABEL}>Márgenes · {prefs.margin}%</span>
          <input
            type="range"
            min={0}
            max={25}
            value={prefs.margin}
            onChange={(e) => set({ margin: Number(e.target.value) })}
            className="w-40 accent-emerald-500"
          />
        </label>

        <label className={ROW}>
          <span className={LABEL}>Colores</span>
          <select
            value={prefs.theme}
            onChange={(e) => set({ theme: e.target.value as ReadingTheme })}
            className="rounded-lg border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15 dark:bg-zinc-800"
          >
            {(Object.keys(READING_THEMES) as ReadingTheme[]).map((theme) => (
              <option key={theme} value={theme}>
                {READING_THEMES[theme].label}
              </option>
            ))}
          </select>
        </label>

        <div className={ROW}>
          <span className={LABEL}>Alineación</span>
          <div className="flex gap-1">
            {(["left", "center"] as const).map((align) => (
              <button
                key={align}
                onClick={() => set({ align })}
                aria-pressed={prefs.align === align}
                className={`rounded-lg border px-2.5 py-1 ${
                  prefs.align === align ? "border-emerald-500 bg-emerald-500/10" : "border-black/10 dark:border-white/15"
                }`}
              >
                {align === "left" ? "Izquierda" : "Centrada"}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Línea guía</legend>
          <label className={ROW}>
            <span className={LABEL}>Mostrar</span>
            <input
              type="checkbox"
              checked={prefs.guide.show}
              onChange={(e) => setGuide({ show: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>
          <label className={ROW}>
            <span className={LABEL}>Altura · {prefs.guide.position}%</span>
            <input
              type="range"
              min={10}
              max={80}
              value={prefs.guide.position}
              onChange={(e) => setGuide({ position: Number(e.target.value) })}
              className="w-40 accent-emerald-500"
            />
          </label>
          <label className={ROW}>
            <span className={LABEL}>Grosor · {prefs.guide.thickness}px</span>
            <input
              type="range"
              min={1}
              max={8}
              value={prefs.guide.thickness}
              onChange={(e) => setGuide({ thickness: Number(e.target.value) })}
              className="w-40 accent-emerald-500"
            />
          </label>
        </fieldset>

        <label className={ROW}>
          <span className={LABEL}>
            Espejo vertical
            <span className="block text-xs text-zinc-500">Para cristales de teleprompter con el monitor tumbado</span>
          </span>
          <input
            type="checkbox"
            checked={prefs.mirrorVertical}
            onChange={(e) => set({ mirrorVertical: e.target.checked })}
            className="h-4 w-4 accent-emerald-500"
          />
        </label>

        <div className="flex justify-between">
          <button onClick={() => saveReading(DEFAULT_READING)} className="text-xs text-zinc-500 hover:underline">
            Restablecer
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
          >
            Listo
          </button>
        </div>
      </div>
    </dialog>
  );
}
