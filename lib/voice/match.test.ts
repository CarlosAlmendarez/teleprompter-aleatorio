import { describe, expect, it } from "vitest";
import { matchPosition, similarWords } from "./match";
import { normalizeWord } from "@/lib/script/parse";

const script = "hoy vamos a hablar de la música en directo y de cómo prepararse para salir al escenario sin miedo"
  .split(" ")
  .map(normalizeWord);
const said = (text: string) => text.split(" ");

describe("similarWords", () => {
  it("accepts exact words, shared prefixes and one typo on long words", () => {
    expect(similarWords("musica", "musica")).toBe(true);
    expect(similarWords("prepara", "prepararse")).toBe(true);
    expect(similarWords("escenaro", "escenario")).toBe(true);
    expect(similarWords("de", "la")).toBe(false);
    expect(similarWords("sal", "sol")).toBe(false);
  });
});

describe("matchPosition", () => {
  it("finds the last word said", () => {
    expect(matchPosition(script, said("hoy vamos a hablar"), 0)).toBe(3);
  });

  it("tolerates misheard and skipped words", () => {
    // "en directo" misheard as "el directo", "y" skipped
    expect(matchPosition(script, said("música el directo de cómo"), 5)).toBe(11);
  });

  it("picks the occurrence nearest the cursor for repeated words", () => {
    // "de" appears at 4 and 10; "de cómo" only fits the second
    expect(matchPosition(script, said("y de cómo"), 8)).toBe(11);
  });

  it("does not jump on a single short or far word", () => {
    expect(matchPosition(script, said("de"), 0)).toBeNull();
    expect(matchPosition(script, said("escenario"), 0)).toBeNull();
    expect(matchPosition(script, said("música"), 4)).toBe(6);
  });

  it("returns null when nothing lines up", () => {
    expect(matchPosition(script, said("otra cosa totalmente"), 0)).toBeNull();
    expect(matchPosition(script, [], 0)).toBeNull();
  });
});
