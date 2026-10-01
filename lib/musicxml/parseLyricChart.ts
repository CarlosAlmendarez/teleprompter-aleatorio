import type { ChordChart } from "./parseChordChart";

// Matches a leading "{m:<measure number>}" tag on its own line, e.g. "{m:57}".
const MEASURE_TAG_RE = /^\s*\{m:\s*([^}]+?)\s*\}\s*$/;

export type LyricSegment = {
  measureNumber: string;
  startSec: number;
  lines: string[];
};

/**
 * Splits raw lyrics text (with `{m:N}` tags marking where each measure's
 * lyrics begin) into segments timed against the chart's playing order.
 * With repeats, the k-th `{m:N}` tag is the k-th time measure N is played
 * (verse 1, then verse 2 over the same measures); a section tagged fewer
 * times than it is played (a chorus written once) is shown again on the
 * later passes. Lines before the first valid tag are dropped.
 */
export function parseLyricSegments(
  lyricsText: string,
  measures: ChordChart["measures"],
): LyricSegment[] {
  const passes = new Map<string, number[]>();
  for (const m of measures) passes.set(m.number, [...(passes.get(m.number) ?? []), m.startSec]);

  const segments: LyricSegment[] = [];
  const tagsUsed = new Map<string, number>();
  const lastSegment = new Map<string, LyricSegment>();
  let current: LyricSegment | null = null;

  for (const rawLine of lyricsText.split("\n")) {
    const tagMatch = rawLine.match(MEASURE_TAG_RE);
    if (tagMatch) {
      const measureNumber = tagMatch[1];
      const starts = passes.get(measureNumber);
      const used = tagsUsed.get(measureNumber) ?? 0;
      if (!starts || used >= starts.length) {
        // Unknown measure (or more tags than times it is played): drop this
        // tag and everything until the next valid one, rather than letting
        // those lines leak into the previous segment.
        current = null;
        continue;
      }
      tagsUsed.set(measureNumber, used + 1);
      current = { measureNumber, startSec: starts[used], lines: [] };
      segments.push(current);
      lastSegment.set(measureNumber, current);
      continue;
    }
    if (!current) continue; // no valid tag seen yet
    if (rawLine.trim().length === 0 && current.lines.length === 0) continue;
    current.lines.push(rawLine);
  }

  for (const segment of segments) {
    while (segment.lines.length > 0 && segment.lines[segment.lines.length - 1].trim() === "") {
      segment.lines.pop();
    }
  }

  for (const [measureNumber, starts] of passes) {
    const used = tagsUsed.get(measureNumber) ?? 0;
    const last = lastSegment.get(measureNumber);
    if (!last) continue;
    for (let pass = used; pass < starts.length; pass++) {
      segments.push({ measureNumber, startSec: starts[pass], lines: [...last.lines] });
    }
  }

  return segments.sort((a, b) => a.startSec - b.startSec);
}

/** Distinct measure numbers in score order. */
export function availableMeasureNumbers(measures: ChordChart["measures"]): string[] {
  return [...new Set(measures.map((m) => m.number))];
}

export type LyricIssues = {
  /** `{m:N}` tags whose measure doesn't exist in the chart (text is dropped). */
  unknownMeasures: string[];
  /** Non-blank lines before the first valid tag (never shown in the player). */
  untaggedLeadingLines: number;
};

/**
 * Reports the lyric lines `parseLyricSegments` silently drops, so the editor
 * can warn about them instead of the text just never appearing on stage.
 */
export function findLyricIssues(lyricsText: string, measureNumbers: string[]): LyricIssues {
  const known = new Set(measureNumbers);
  const unknown = new Set<string>();
  let seenValidTag = false;
  let untaggedLeadingLines = 0;

  for (const rawLine of lyricsText.split("\n")) {
    const tagMatch = rawLine.match(MEASURE_TAG_RE);
    if (tagMatch) {
      if (known.has(tagMatch[1])) seenValidTag = true;
      else unknown.add(tagMatch[1]);
      continue;
    }
    if (!seenValidTag && rawLine.trim().length > 0) untaggedLeadingLines += 1;
  }

  return { unknownMeasures: [...unknown], untaggedLeadingLines };
}
