import type { ChordProLine, ChordProSong, ChordSegment } from "@/lib/chordpro/parse";
import { SECTION_LABEL } from "@/lib/chordpro/parse";

/**
 * Renders a parsed ChordPro song for the teleprompter. Every size is in `em`,
 * so the font-size slider scales chords and lyrics together. Each chord sits
 * above the first word it applies to, in a column as wide as the wider of the
 * two, so short syllables never make neighbouring chords overlap; the rest of
 * the text flows (and wraps) normally.
 */
export function ChordProText({ song, renderChord }: { song: ChordProSong; renderChord: (chord: string) => string }) {
  return (
    <div className="flex flex-col gap-[0.9em]">
      {(song.title || song.subtitle) && (
        <header>
          {song.title && <div className="text-[1.15em] font-bold leading-tight">{song.title}</div>}
          {song.subtitle && <div className="text-[0.6em] text-zinc-500 dark:text-zinc-400">{song.subtitle}</div>}
        </header>
      )}
      {song.sections.map((section, si) => {
        const labelled = section.type !== "none";
        return (
          <section
            key={si}
            className={
              section.type === "chorus"
                ? "border-l-[0.12em] border-emerald-500 pl-[0.6em] dark:border-emerald-400"
                : labelled
                  ? "border-l-[0.12em] border-black/15 pl-[0.6em] dark:border-white/20"
                  : ""
            }
          >
            {labelled && (
              <div className="mb-[0.2em] text-[0.45em] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {section.label ?? SECTION_LABEL[section.type as Exclude<typeof section.type, "none">]}
              </div>
            )}
            {section.lines.map((line, li) => (
              <Line key={li} line={line} renderChord={renderChord} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Line({ line, renderChord }: { line: ChordProLine; renderChord: (chord: string) => string }) {
  if (line.kind === "blank") return <div className="h-[0.6em]" />;
  if (line.kind === "comment") {
    return <div className="text-[0.6em] italic text-zinc-500 dark:text-zinc-400">{line.text}</div>;
  }
  if (line.kind === "tab") {
    return <div className="whitespace-pre font-mono text-[0.45em] leading-snug">{line.text}</div>;
  }
  const hasChords = line.segments.some((s) => s.chord);
  if (!hasChords) return <div className="whitespace-pre-wrap">{line.segments.map((s) => s.text).join("")}</div>;
  const chordsOnly = line.segments.every((s) => !s.text.trim());
  if (chordsOnly) {
    return (
      <div className="flex flex-wrap gap-x-[0.8em] text-[0.7em] font-bold text-emerald-600 dark:text-emerald-400">
        {line.segments.map((s, i) => (s.chord ? <span key={i}>{renderChord(s.chord)}</span> : null))}
      </div>
    );
  }
  return <div className="whitespace-pre-wrap">{line.segments.map((s, i) => <Segment key={i} segment={s} renderChord={renderChord} />)}</div>;
}

function Segment({ segment, renderChord }: { segment: ChordSegment; renderChord: (chord: string) => string }) {
  if (!segment.chord) return <>{segment.text}</>;
  // The chord anchors on the first word; the rest of the segment flows freely.
  const [, anchor, rest] = segment.text.match(/^(\S*\s?)([\s\S]*)$/) ?? ["", segment.text, ""];
  return (
    <>
      <span className="inline-flex flex-col align-bottom">
        <span className="pr-[0.3em] text-[0.62em] font-bold leading-[1.2] text-emerald-600 dark:text-emerald-400">
          {renderChord(segment.chord)}
        </span>
        <span className="whitespace-pre">{anchor || " "}</span>
      </span>
      {rest}
    </>
  );
}
