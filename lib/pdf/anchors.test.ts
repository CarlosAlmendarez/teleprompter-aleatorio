import { describe, expect, it } from "vitest";
import { anchorControlPoints, parseAnchorText, scrollAtTime, serializeAnchors } from "./anchors";

describe("parseAnchorText", () => {
  it("parses page:measure lines with several separators, sorted by page", () => {
    expect(parseAnchorText("3=33\n1:1\n 2 - 17 ")).toEqual([
      { page: 1, measure: 1 },
      { page: 2, measure: 17 },
      { page: 3, measure: 33 },
    ]);
  });

  it("ignores blanks, comments, junk, zeros and duplicate pages", () => {
    expect(parseAnchorText("# comentario\n\nfoo\n0:4\n2:0\n2:10\n2:20")).toEqual([
      { page: 2, measure: 10 },
    ]);
  });

  it("round-trips through serializeAnchors", () => {
    const anchors = [
      { page: 1, measure: 1 },
      { page: 2, measure: 9 },
    ];
    expect(parseAnchorText(serializeAnchors(anchors))).toEqual(anchors);
  });
});

describe("anchorControlPoints + scrollAtTime", () => {
  const measureStart = new Map([
    [1, 0],
    [9, 20],
  ]);
  const pageTop = [0, 1000, 2000];
  const points = anchorControlPoints({
    anchors: [
      { page: 2, measure: 9 },
      { page: 3, measure: 99 }, // unknown measure: skipped
    ],
    measureStartSec: (m) => measureStart.get(m),
    pageTop: (p) => pageTop[p - 1],
    totalDurationSec: 60,
    scrollMax: 2500,
  });

  it("pins start and end and adds valid anchors", () => {
    expect(points).toEqual([
      { t: 0, scroll: 0 },
      { t: 20, scroll: 1000 },
      { t: 60, scroll: 2500 },
    ]);
  });

  it("interpolates linearly and clamps at both ends", () => {
    expect(scrollAtTime(points, -5)).toBe(0);
    expect(scrollAtTime(points, 10)).toBe(500);
    expect(scrollAtTime(points, 40)).toBe(1750);
    expect(scrollAtTime(points, 999)).toBe(2500);
  });

  it("returns 0 for an empty curve", () => {
    expect(scrollAtTime([], 5)).toBe(0);
  });
});

describe("anchors with repeats", () => {
  it("adds a point each time the anchored measure is played, scrolling back", () => {
    const points = anchorControlPoints({
      anchors: [{ page: 1, measure: 1 }, { page: 2, measure: 5 }],
      // measure 1 is played at 0 s and again at 40 s (repeat)
      measureStartSec: (m) => (m === 1 ? [0, 40] : m === 5 ? [20] : undefined),
      pageTop: (p) => [0, 1000][p - 1],
      totalDurationSec: 60,
      scrollMax: 1500,
    });
    expect(points).toEqual([
      { t: 0, scroll: 0 },
      { t: 0, scroll: 0 },
      { t: 20, scroll: 1000 },
      { t: 40, scroll: 0 },
      { t: 60, scroll: 1500 },
    ]);
    expect(scrollAtTime(points, 30)).toBe(500); // heading back up for the repeat
  });
});
