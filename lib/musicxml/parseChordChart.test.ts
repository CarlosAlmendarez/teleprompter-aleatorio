import { describe, expect, it } from "vitest";
import { parseChordChart, playingOrder } from "./parseChordChart";

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
      <attributes><time><beats>4</beats><beat-type>4</beat-type></time><key><fifths>-2</fifths><mode>minor</mode></key></attributes>
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
    expect(chart.key).toBe("Gm");
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

describe("multi-part scores", () => {
  const h = (step: string) => `<harmony><root><root-step>${step}</root-step></root><kind>major</kind></harmony>`;
  const xml = `<part-list><score-part id="P1"><part-name>Voz</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1"><direction><sound tempo="60"/></direction></measure>
      <measure number="2"></measure>
    </part>
    <part id="P2">
      <measure number="1">${h("C")}</measure>
      <measure number="2">${h("G")}</measure>
    </part>`;
  const chart = parseChordChart(xml);

  it("reads measures once, from the part with the chords", () => {
    expect(chart.measures.map((m) => `${m.number}:${m.chords.join("")}`)).toEqual(["1:C", "2:G"]);
  });

  it("still applies tempo marks written on another part", () => {
    // 4/4 at 60 bpm = 4 s per measure
    expect(chart.totalDurationSec).toBe(8);
  });
});

describe("playing order", () => {
  const measure = (n: number, inner = "") => `<measure number="${n}">${inner}</measure>`;
  const fwd = `<barline location="left"><repeat direction="forward"/></barline>`;
  const back = (times?: number) =>
    `<barline location="right"><repeat direction="backward"${times ? ` times="${times}"` : ""}/></barline>`;
  const ending = (n: string, type: string) => `<barline><ending number="${n}" type="${type}"/></barline>`;
  const order = (xml: string) => parseChordChart(xml).measures.map((m) => m.number).join(" ");

  it("repeats a section twice by default, or `times` times", () => {
    expect(order(measure(1) + measure(2, fwd) + measure(3, back()) + measure(4))).toBe("1 2 3 2 3 4");
    expect(order(measure(1, fwd) + measure(2, back(3)))).toBe("1 2 1 2 1 2");
  });

  it("repeats from the start when there is no forward repeat", () => {
    expect(order(measure(1) + measure(2, back()) + measure(3))).toBe("1 2 1 2 3");
  });

  it("takes first and second endings in turn", () => {
    const xml =
      measure(1, fwd) +
      measure(2, ending("1", "start") + ending("1", "stop") + back()) +
      measure(3, ending("2", "start") + ending("2", "discontinue")) +
      measure(4);
    expect(order(xml)).toBe("1 2 1 3 4");
  });

  it("follows D.C. al Fine without taking repeats again", () => {
    const xml =
      measure(1, fwd) + measure(2, `<direction><sound fine="yes"/></direction>` + back()) + measure(3, `<sound dacapo="yes"/>`);
    expect(order(xml)).toBe("1 2 1 2 3 1 2");
  });

  it("follows D.S. al Coda", () => {
    const xml =
      measure(1) +
      measure(2, `<direction><direction-type><segno/></direction-type></direction>`) +
      measure(3, `<sound tocoda="coda"/>`) +
      measure(4, `<sound dalsegno="segno"/>`) +
      measure(5, `<direction><direction-type><coda/></direction-type></direction>`);
    expect(order(xml)).toBe("1 2 3 4 2 3 5");
  });

  it("numbers each pass and times the unrolled order", () => {
    const chart = parseChordChart(measure(1, fwd) + measure(2, back()));
    expect(chart.measures.map((m) => m.pass)).toEqual([0, 0, 1, 1]);
    expect(chart.measures.map((m) => m.startSec)).toEqual([0, 2, 4, 6]);
    expect(chart.written.map((m) => m.number)).toEqual(["1", "2"]);
  });

  it("never loops forever on malformed marks", () => {
    const flags = Array.from({ length: 3 }, () => ({
      forward: false,
      backward: null,
      endingStart: null,
      endingStop: false,
      segno: false,
      coda: false,
      toCoda: false,
      daCapo: true,
      dalSegno: false,
      fine: false,
    }));
    expect(playingOrder(flags).length).toBeLessThanOrEqual(3 * 8 + 64);
  });
});
