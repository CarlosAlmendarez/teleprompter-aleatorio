"use client";

import type { DocumentType } from "@/lib/types";
import type { SetlistItemOverrides } from "@/lib/setlists/types";
import { formatShift } from "@/lib/music/transpose";

const FIELD =
  "w-full rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-white/15";

/** Parses a number input: empty → unset (falls back to the document). */
function numberOrUnset(value: string, min: number, max: number): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
}

/**
 * Per-step settings for a setlist item. Empty fields mean "use the document's
 * own setting"; the players also save changes made on stage back here.
 */
export function ItemSettings({
  type,
  overrides,
  onChange,
}: {
  type: DocumentType;
  overrides: SetlistItemOverrides;
  onChange: (next: SetlistItemOverrides) => void;
}) {
  function set<K extends keyof SetlistItemOverrides>(key: K, value: SetlistItemOverrides[K] | undefined) {
    const next = { ...overrides };
    if (value === undefined || value === "") delete next[key];
    else next[key] = value;
    onChange(next);
  }

  const isPrompter = type === "text" || type === "chordpro";
  const hasChords = type === "chordpro" || type === "musicxml";

  return (
    <div className="grid gap-3 border-t border-black/5 px-3 pb-3 pt-3 text-xs sm:grid-cols-3 dark:border-white/5">
      {isPrompter && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Velocidad (px/s)</span>
            <input
              type="number"
              min={5}
              max={200}
              step={5}
              value={overrides.speed ?? ""}
              placeholder="Del documento"
              onChange={(e) => set("speed", numberOrUnset(e.target.value, 5, 200))}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Tamaño de letra (px)</span>
            <input
              type="number"
              min={18}
              max={90}
              value={overrides.fontSize ?? ""}
              placeholder="Del documento"
              onChange={(e) => set("fontSize", numberOrUnset(e.target.value, 18, 90))}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Espejo</span>
            <select
              value={overrides.mirror === undefined ? "" : overrides.mirror ? "on" : "off"}
              onChange={(e) => set("mirror", e.target.value === "" ? undefined : e.target.value === "on")}
              className={FIELD}
            >
              <option value="">Del documento</option>
              <option value="on">Activado</option>
              <option value="off">Desactivado</option>
            </select>
          </label>
        </>
      )}
      {type === "musicxml" && (
        <label className="flex flex-col gap-1">
          <span className="text-zinc-500">Tempo (%)</span>
          <input
            type="number"
            min={50}
            max={150}
            step={5}
            value={overrides.tempoPct ?? ""}
            placeholder="Del documento"
            onChange={(e) => set("tempoPct", numberOrUnset(e.target.value, 50, 150))}
            className={FIELD}
          />
        </label>
      )}
      {hasChords && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Tono (semitonos)</span>
            <select
              value={overrides.transpose ?? ""}
              onChange={(e) => set("transpose", e.target.value === "" ? undefined : Number(e.target.value))}
              className={FIELD}
            >
              <option value="">Del documento</option>
              {Array.from({ length: 23 }, (_, i) => i - 11).map((n) => (
                <option key={n} value={n}>
                  {formatShift(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-zinc-500">Cejilla</span>
            <select
              value={overrides.capo ?? ""}
              onChange={(e) => set("capo", e.target.value === "" ? undefined : Number(e.target.value))}
              className={FIELD}
            >
              <option value="">Del documento</option>
              {Array.from({ length: 12 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Sin cejilla" : `Traste ${n}`}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="flex flex-col gap-1 sm:col-span-3">
        <span className="text-zinc-500">Nota para este paso (se muestra al reproducir)</span>
        <input
          value={overrides.transitionNote ?? ""}
          maxLength={300}
          placeholder="Ej. cambiar a guitarra acústica"
          onChange={(e) => set("transitionNote", e.target.value || undefined)}
          className={FIELD}
        />
      </label>
    </div>
  );
}
