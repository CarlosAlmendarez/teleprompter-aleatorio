import type { ChordChart as ChordChartData } from "@/lib/musicxml/parseChordChart";
import { accidentalsForShift, formatShift, prettyAccidentals, transposeChord, transposeKey } from "@/lib/music/transpose";

/**
 * The written chart (score order, each measure once) on the document page,
 * shown in the key the player will use: the saved transposition minus the
 * capo, like the player itself.
 */
export function ChordChart({
  data,
  transpose = 0,
  capo = 0,
}: {
  data: ChordChartData;
  transpose?: number;
  capo?: number;
}) {
  const measures = data.written;
  const hasMeasures = measures.some((m) => m.chords.length > 0);
  const shift = transpose - capo;
  const accidentals = accidentalsForShift(data.key, shift, measures.find((m) => m.chords.length > 0)?.chords[0]);
  const show = (chord: string) => prettyAccidentals(transposeChord(chord, shift, accidentals));
  const repeats = data.measures.length > measures.length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        {data.tempo && <span>♩ = {data.tempo}</span>}
        {data.beats && data.beatType && (
          <span>
            {data.beats}/{data.beatType}
          </span>
        )}
        {data.key && <span>Tonalidad {prettyAccidentals(data.key)}</span>}
        {(transpose !== 0 || capo > 0) && (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            {transpose !== 0 && `Tono ${formatShift(transpose)}${data.key ? ` → ${prettyAccidentals(transposeKey(data.key, transpose))}` : ""}`}
            {transpose !== 0 && capo > 0 && " · "}
            {capo > 0 && `Cejilla ${capo}`}
          </span>
        )}
        {repeats && <span>Con repeticiones: {data.measures.length} compases al tocarla</span>}
      </div>

      {hasMeasures ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {measures.map((measure) => (
            <div
              key={measure.index}
              className="flex min-h-20 flex-col justify-between rounded-xl border border-black/10 bg-black/[.02] p-3 dark:border-white/10 dark:bg-white/[.03]"
            >
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{measure.number}</span>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                {measure.chords.length > 0 ? (
                  measure.chords.map((chord, i) => (
                    <span key={i} className="text-xl font-bold leading-none text-zinc-900 dark:text-zinc-50">
                      {show(chord)}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-700">%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No se encontraron acordes en este archivo MusicXML.</p>
      )}
    </div>
  );
}
