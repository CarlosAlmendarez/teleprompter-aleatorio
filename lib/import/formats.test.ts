import { describe, expect, it } from "vitest";
import { baseName, detectImport, docxHtmlToScript, onsongToChordPro, storedType } from "./formats";
import { parseChordPro } from "@/lib/chordpro/parse";

describe("detectImport", () => {
  it("classifies files by extension, case-insensitively", () => {
    expect(detectImport("Partitura.PDF")).toBe("pdf");
    expect(detectImport("song.musicxml")).toBe("musicxml");
    expect(detectImport("song.cho")).toBe("chordpro");
    expect(detectImport("song.chopro")).toBe("chordpro");
    expect(detectImport("song.onsong")).toBe("onsong");
    expect(detectImport("guion.docx")).toBe("docx");
    expect(detectImport("notas.txt")).toBe("text");
    expect(detectImport("foto.jpg")).toBeNull();
  });

  it("maps kinds to stored document types", () => {
    expect(storedType("onsong")).toBe("chordpro");
    expect(storedType("docx")).toBe("text");
    expect(storedType("musicxml")).toBe("musicxml");
  });

  it("strips the extension for a fallback title", () => {
    expect(baseName("Mi canción.onsong")).toBe("Mi canción");
    expect(baseName(".cho")).toBe("Sin título");
  });
});

describe("onsongToChordPro", () => {
  const ONSONG = `Luna de papel
Los Ejemplos
Key: G
Tempo: 96

Verse 1:
[G]Hola [Em]luna
[C]dime

Chorus:
[C]Canta con[D]migo

Tag:
[G]fin`;

  it("turns the header into directives", () => {
    const { title, content } = onsongToChordPro(ONSONG);
    expect(title).toBe("Luna de papel");
    expect(content).toContain("{title: Luna de papel}");
    expect(content).toContain("{artist: Los Ejemplos}");
    expect(content).toContain("{key: G}");
    expect(content).toContain("{tempo: 96}");
  });

  it("produces ChordPro our parser reads into sections", () => {
    const song = parseChordPro(onsongToChordPro(ONSONG).content);
    expect(song.title).toBe("Luna de papel");
    expect(song.key).toBe("G");
    expect(song.sections.map((s) => [s.type, s.label])).toEqual([
      ["verse", "Verse 1"],
      ["chorus", "Chorus"],
      ["none", null],
    ]);
    expect(song.sections[2].lines[0]).toEqual({ kind: "comment", text: "Tag" });
  });

  it("handles a file with metadata lines only in the header", () => {
    const { title, content } = onsongToChordPro("Title: Otra\nCapo: 2\n\n[A]la");
    expect(title).toBe("Otra");
    expect(parseChordPro(content)).toMatchObject({ title: "Otra", capo: 2 });
  });
});

describe("docxHtmlToScript", () => {
  it("keeps headings as sections, lists and paragraphs, and decodes entities", () => {
    const html =
      "<h1>Apertura</h1><p>Buenas noches &amp; bienvenidos.</p><p>Segunda <strong>línea</strong>.</p>" +
      "<h2>Lista</h2><ul><li>Uno</li><li>Dos</li></ul><p>Fin&#33;</p>";
    expect(docxHtmlToScript(html)).toBe(
      "# Apertura\n\nBuenas noches & bienvenidos.\n\nSegunda línea.\n\n# Lista\n\n- Uno\n- Dos\n\nFin!\n",
    );
  });
});
