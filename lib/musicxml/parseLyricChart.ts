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
 * lyrics begin) into segments, resolving each tag's real-time start offset
 * from the chord chart's already-computed measure timing. Lines before the
 * first tag are dropped — they have no measure to sync against.
 */
export function parseLyricSegments(
  lyricsText: string,
  measures: ChordChart["measures"],
): LyricSegment[] {
  const startSecByMeasure = new Map(measures.map((m) => [m.number, m.startSec]));
  const segments: LyricSegment[] = [];
  let current: LyricSegment | null = null;

  for (const rawLine of lyricsText.split("\n")) {
    const tagMatch = rawLine.match(MEASURE_TAG_RE);
    if (tagMatch) {
      const measureNumber = tagMatch[1];
      const startSec = startSecByMeasure.get(measureNumber);
      if (startSec === undefined) {
        // Unknown measure number: drop this tag and everything until the
        // next valid one, rather than letting those lines leak into the
        // previous segment.
        current = null;
        continue;
      }
      current = { measureNumber, startSec, lines: [] };
      segments.push(current);
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

  return segments.sort((a, b) => a.startSec - b.startSec);
}

export function availableMeasureNumbers(measures: ChordChart["measures"]): string[] {
  return measures.map((m) => m.number);
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
