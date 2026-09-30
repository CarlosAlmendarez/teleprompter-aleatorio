import { describe, expect, it } from "vitest";
import { normalizeWord, parseScript, tokenizeScript } from "./parse";

const SCRIPT = `# Apertura
Buenas noches, ((mirar a cámara 2)) bienvenidos.

## Cierre
Gracias.`;

describe("parseScript", () => {
  const parsed = parseScript(SCRIPT);

  it("turns # lines into numbered sections", () => {
    expect(parsed.sections).toEqual([
      { id: "sec-1", title: "Apertura" },
      { id: "sec-2", title: "Cierre" },
    ]);
    expect(parsed.lines[0]).toEqual({ kind: "heading", id: "sec-1", text: "Apertura" });
  });

  it("splits ((notes)) out of the spoken text", () => {
    expect(parsed.lines[1]).toEqual({
      kind: "text",
      parts: [
        { text: "Buenas noches, ", note: false },
        { text: "mirar a cámara 2", note: true },
        { text: " bienvenidos.", note: false },
      ],
    });
    expect(parsed.lines[2]).toEqual({ kind: "blank" });
  });

  it("does not treat a hashtag without a space as a heading", () => {
    expect(parseScript("#hashtag").lines[0].kind).toBe("text");
  });
});

describe("tokenizeScript", () => {
  it("numbers spoken words only, skipping notes and headings", () => {
    const { words, tokens } = tokenizeScript(parseScript(SCRIPT).lines);
    expect(words).toEqual(["buenas", "noches", "bienvenidos", "gracias"]);
    const noteTokens = tokens[1][1];
    expect(noteTokens.every((t) => t.word === null)).toBe(true);
    expect(tokens[1][0].map((t) => t.word)).toEqual([0, null, 1, null]);
  });
});

describe("normalizeWord", () => {
  it("strips case, accents and punctuation", () => {
    expect(normalizeWord("¡Canción!")).toBe("cancion");
    expect(normalizeWord("Año,")).toBe("ano");
    expect(normalizeWord("—")).toBe("");
  });
});
