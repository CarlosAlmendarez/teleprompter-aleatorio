import { describe, expect, it } from "vitest";
import { availableMeasureNumbers, findLyricIssues, parseLyricSegments } from "./parseLyricChart";
import type { ChordChartMeasure } from "./parseChordChart";

const measures: ChordChartMeasure[] = ["1", "2", "3"].map((number, i) => ({
  number,
  chords: [],
  tempo: 120,
  beats: 4,
  beatType: 4,
  startSec: i * 2,
  durationSec: 2,
}));

describe("parseLyricSegments", () => {
  it("splits lyrics at {m:N} tags and resolves their start time", () => {
    const segments = parseLyricSegments("{m:1}\nHola\nmundo\n\n{m:3}\nAdiós\n", measures);
    expect(segments).toEqual([
      { measureNumber: "1", startSec: 0, lines: ["Hola", "mundo"] },
      { measureNumber: "3", startSec: 4, lines: ["Adiós"] },
    ]);
  });

  it("tolerates spaces after the colon and sorts segments by time", () => {
    const segments = parseLyricSegments("{m: 3 }\nC\n{m:2}\nB", measures);
    expect(segments.map((s) => s.measureNumber)).toEqual(["2", "3"]);
  });

  it("drops text before the first tag and under unknown measures", () => {
    const segments = parseLyricSegments("intro\n{m:9}\nperdido\n{m:2}\nok", measures);
    expect(segments).toEqual([{ measureNumber: "2", startSec: 2, lines: ["ok"] }]);
  });
});

describe("findLyricIssues", () => {
  it("reports unknown measures and untagged leading lines", () => {
    expect(findLyricIssues("intro\n\notra\n{m:9}\nx\n{m:1}\ny\n{m:9}\n{m:12}", availableMeasureNumbers(measures))).toEqual({
      unknownMeasures: ["9", "12"],
      untaggedLeadingLines: 3,
    });
  });

  it("reports nothing for well-formed lyrics", () => {
    expect(findLyricIssues("{m:1}\nHola", availableMeasureNumbers(measures))).toEqual({
      unknownMeasures: [],
      untaggedLeadingLines: 0,
    });
  });
});
