import { describe, expect, it } from "vitest";
import {
  accidentalsForShift,
  formatShift,
  keyFromFifths,
  parseKey,
  prettyAccidentals,
  transposeChord,
  transposeKey,
} from "./transpose";

describe("transposeChord", () => {
  it("moves roots and keeps the chord quality", () => {
    expect(transposeChord("C", 2)).toBe("D");
    expect(transposeChord("Am7", 3)).toBe("Cm7");
    expect(transposeChord("G7sus4", 5)).toBe("C7sus4");
  });

  it("wraps around the octave and handles negative shifts", () => {
    expect(transposeChord("B", 1)).toBe("C");
    expect(transposeChord("C", -1)).toBe("B");
    expect(transposeChord("E", -14)).toBe("D");
  });

  it("transposes a slash bass too", () => {
    expect(transposeChord("C/E", 2)).toBe("D/F#");
    expect(transposeChord("G/B", 3, "flats")).toBe("Bb/D");
  });

  it("does not mistake a 6/9 extension for a bass note", () => {
    expect(transposeChord("C6/9", 2)).toBe("D6/9");
  });

  it("spells with the requested accidentals and keeps Unicode style", () => {
    expect(transposeChord("D", 1, "flats")).toBe("Eb");
    expect(transposeChord("D", 1, "sharps")).toBe("D#");
    expect(transposeChord("B♭7", 2, "sharps")).toBe("C7");
    expect(transposeChord("A", 1, "flats")).toBe("Bb");
    expect(transposeChord("F♯m", 1, "sharps")).toBe("Gm");
    expect(transposeChord("E♭", 2, "sharps")).toBe("F");
    expect(transposeChord("C♯m", 1, "flats")).toBe("Dm");
    expect(transposeChord("G♭", 1, "sharps")).toBe("G");
    expect(transposeChord("C♯", 0)).toBe("C♯");
  });

  it("leaves non-chords untouched", () => {
    expect(transposeChord("N.C.", 3)).toBe("N.C.");
    expect(transposeChord("%", 3)).toBe("%");
    expect(transposeChord("", 3)).toBe("");
  });
});

describe("keys", () => {
  it("parses key names", () => {
    expect(parseKey("Bb")).toEqual({ pc: 10, minor: false, spelled: "flats" });
    expect(parseKey("F#m")).toEqual({ pc: 6, minor: true, spelled: "sharps" });
    expect(parseKey("nope")).toBeNull();
  });

  it("transposes keys with conventional spelling", () => {
    expect(transposeKey("C", 5)).toBe("F");
    expect(transposeKey("C", 3)).toBe("Eb");
    expect(transposeKey("G", -1)).toBe("F#");
    expect(transposeKey("Am", 1)).toBe("Bbm");
    expect(transposeKey("Em", 2)).toBe("F#m");
  });

  it("picks accidentals from the target key, or the first chord", () => {
    expect(accidentalsForShift("C", 3)).toBe("flats"); // → Eb
    expect(accidentalsForShift("C", 2)).toBe("sharps"); // → D
    expect(accidentalsForShift("Dm", 0)).toBe("flats");
    expect(accidentalsForShift(null, 5, "Cmaj7")).toBe("flats"); // → F
    expect(accidentalsForShift(null, 2, null)).toBe("sharps");
  });

  it("maps MusicXML fifths to key names", () => {
    expect(keyFromFifths(0, "major")).toBe("C");
    expect(keyFromFifths(-2, null)).toBe("Bb");
    expect(keyFromFifths(1, "minor")).toBe("Em");
    expect(keyFromFifths(9, null)).toBeNull();
  });

  it("formats shifts for display", () => {
    expect(formatShift(0)).toBe("0");
    expect(formatShift(2)).toBe("+2");
    expect(formatShift(-3)).toBe("−3");
  });
});

describe("prettyAccidentals", () => {
  it("uses musical symbols without touching extensions", () => {
    expect(prettyAccidentals("Bb7/F#")).toBe("B♭7/F♯");
    expect(prettyAccidentals("C7b9")).toBe("C7b9");
    expect(prettyAccidentals("Ebm")).toBe("E♭m");
  });
});
