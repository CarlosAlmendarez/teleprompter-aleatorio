import { describe, expect, it } from "vitest";
import { parseChordChart } from "./parseChordChart";

function harmony(step: string, kind: string, alter?: number, text?: string) {
  return `<harmony>
    <root><root-step>${step}</root-step>${alter !== undefined ? `<root-alter>${alter}</root-alter>` : ""}</root>
    <kind${text !== undefined ? ` text="${text}"` : ""}>${kind}</kind>
  </harmony>`;
}

const SCORE = `<?xml version="1.0"?>
<score-partwise>
  <work><work-title> Mi Canción </work-title></work>
  <part id="P1">
    <measure number="1">
      <attributes><time><beats>4</beats><beat-type>4</beat-type></time><key><mode>minor</mode></key></attributes>
      <direction><sound tempo="120"/><direction-type><metronome><per-minute>120</per-minute></metronome></direction-type></direction>
      ${harmony("C", "major")}
      ${harmony("A", "minor-seventh")}
    </measure>
    <measure number="2">
      ${harmony("B", "dominant", -1)}
    </measure>
    <measure number="3">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="60"/></direction>
      ${harmony("F", "major", 1, "maj9")}
    </measure>
    <measure number="4"></measure>
  </part>
</score-partwise>`;

describe("parseChordChart", () => {
  const chart = parseChordChart(SCORE);

  it("reads header fields", () => {
    expect(chart.title).toBe("Mi Canción");
    expect(chart.tempo).toBe(120);
    expect(chart.beats).toBe(4);
    expect(chart.beatType).toBe(4);
    expect(chart.keyMode).toBe("minor");
  });

  it("builds chord symbols with alterations and kind text overrides", () => {
    expect(chart.measures.map((m) => m.chords)).toEqual([["C", "Am7"], ["B♭7"], ["F♯maj9"], []]);
  });

  it("times measures, applying tempo and meter changes forward", () => {
    // 4/4 @120 = 2s; 3/4 @60 = 3s
    expect(chart.measures.map((m) => m.startSec)).toEqual([0, 2, 4, 7]);
    expect(chart.measures.map((m) => m.durationSec)).toEqual([2, 2, 3, 3]);
    expect(chart.totalDurationSec).toBe(10);
  });

  it("falls back to 120 bpm 4/4 when the file has no tempo or meter", () => {
    const bare = parseChordChart(`<measure number="1">${harmony("G", "major")}</measure>`);
    expect(bare.tempo).toBeNull();
    expect(bare.measures[0]).toMatchObject({ tempo: 120, beats: 4, beatType: 4, durationSec: 2 });
  });

  it("returns an empty chart for empty input", () => {
    expect(parseChordChart("")).toMatchObject({ title: null, measures: [], totalDurationSec: 0 });
  });
});
