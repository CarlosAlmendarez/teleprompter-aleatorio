import type { ChordChart as ChordChartData } from "@/lib/musicxml/parseChordChart";

export function ChordChart({ data }: { data: ChordChartData }) {
  const hasMeasures = data.measures.some((m) => m.chords.length > 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        {data.tempo && <span>♩ = {data.tempo}</span>}
        {data.beats && data.beatType && (
          <span>
            {data.beats}/{data.beatType}
          </span>
        )}
        {data.keyMode && <span className="capitalize">{data.keyMode}</span>}
      </div>

      {hasMeasures ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {data.measures.map((measure) => (
            <div
              key={measure.number}
              className="flex min-h-20 flex-col justify-between rounded-xl border border-black/10 bg-black/[.02] p-3 dark:border-white/10 dark:bg-white/[.03]"
            >
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {measure.number}
              </span>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                {measure.chords.length > 0 ? (
                  measure.chords.map((chord, i) => (
                    <span
                      key={i}
                      className="text-xl font-bold leading-none text-zinc-900 dark:text-zinc-50"
                    >
                      {chord}
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
        <p className="text-sm text-zinc-500">
          No se encontraron acordes en este archivo MusicXML.
        </p>
      )}
    </div>
  );
}
