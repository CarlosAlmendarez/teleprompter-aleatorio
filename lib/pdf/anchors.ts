import type { PdfAnchor } from "@/lib/db/schema";

// Helpers for the split-screen PDF pane: turn a plain-text list of
// `page:measure` alignment points into structured anchors, and interpolate a
// scroll position for the PDF from the player's elapsed time.

const LINE_RE = /^\s*(\d+)\s*[:=\-–]\s*(\d+)\s*$/;

/**
 * Parses anchor text — one `page:measure` pair per line (`:`, `=` or `-` as the
 * separator). Blank lines and `#` comments are ignored; only the first entry
 * for a given page is kept. Result is sorted by page.
 */
export function parseAnchorText(text: string): PdfAnchor[] {
  const out: PdfAnchor[] = [];
  const seenPages = new Set<number>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const match = line.match(LINE_RE);
    if (!match) continue;
    const page = Number(match[1]);
    const measure = Number(match[2]);
    if (page < 1 || measure < 1 || seenPages.has(page)) continue;
    seenPages.add(page);
    out.push({ page, measure });
  }
  return out.sort((a, b) => a.page - b.page);
}

export function serializeAnchors(anchors: PdfAnchor[]): string {
  return anchors.map((a) => `${a.page}:${a.measure}`).join("\n");
}

export type ScrollControlPoint = { t: number; scroll: number };

/**
 * Builds the piecewise-linear curve mapping elapsed seconds → PDF scrollTop.
 * Always pinned to (0, 0) at the start and (totalDurationSec, scrollMax) at the
 * end; each valid anchor adds an interior point at its measure's start time and
 * its page's top offset. Anchors referencing an unknown measure/page are skipped.
 */
export function anchorControlPoints({
  anchors,
  measureStartSec,
  pageTop,
  totalDurationSec,
  scrollMax,
}: {
  anchors: PdfAnchor[];
  measureStartSec: (measure: number) => number | undefined;
  pageTop: (page: number) => number | undefined;
  totalDurationSec: number;
  scrollMax: number;
}): ScrollControlPoint[] {
  const points: ScrollControlPoint[] = [{ t: 0, scroll: 0 }];
  for (const anchor of anchors) {
    const t = measureStartSec(anchor.measure);
    const scroll = pageTop(anchor.page);
    if (t === undefined || scroll === undefined) continue;
    points.push({ t, scroll: clamp(scroll, 0, scrollMax) });
  }
  points.push({ t: Math.max(totalDurationSec, 0.001), scroll: scrollMax });
  return points.sort((a, b) => a.t - b.t);
}

/** Linear interpolation over sorted control points, clamped at both ends. */
export function scrollAtTime(points: ScrollControlPoint[], t: number): number {
  if (points.length === 0) return 0;
  if (t <= points[0].t) return points[0].scroll;
  const last = points[points.length - 1];
  if (t >= last.t) return last.scroll;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      const span = b.t - a.t;
      if (span <= 0) return b.scroll;
      return a.scroll + ((t - a.t) / span) * (b.scroll - a.scroll);
    }
  }
  return last.scroll;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
