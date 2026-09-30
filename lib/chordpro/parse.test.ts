import { describe, expect, it } from "vitest";
import { firstChord, parseChordPro } from "./parse";

const SONG = `{title: Luna de papel}
{st: Demo}
{key: G}
{tempo: 96}
{capo: 2}
# nota para mí, no se muestra
{c: Intro suave}
[G]Hola [Em]luna, [C]dime [D]
sin acordes aquí

{soc: Coro final}
[C]Canta
{eoc}
{chorus}
{sot}
e|--0--|
{eot}
{x_custom: oculto}`;

describe("parseChordPro", () => {
  const song = parseChordPro(SONG);

  it("reads header directives", () => {
    expect(song).toMatchObject({ title: "Luna de papel", subtitle: "Demo", key: "G", tempo: 96, capo: 2 });
  });

  it("pairs each chord with the text that follows it", () => {
    const first = song.sections[0].lines[1];
    expect(first).toEqual({
      kind: "lyrics",
      segments: [
        { chord: "G", text: "Hola " },
        { chord: "Em", text: "luna, " },
        { chord: "C", text: "dime " },
        { chord: "D", text: "" },
      ],
    });
    expect(song.sections[0].lines[2]).toEqual({ kind: "lyrics", segments: [{ chord: null, text: "sin acordes aquí" }] });
  });

  it("keeps leading text before the first chord", () => {
    const s = parseChordPro("Oh [A]yeah");
    expect(s.sections[0].lines[0]).toEqual({
      kind: "lyrics",
      segments: [
        { chord: null, text: "Oh " },
        { chord: "A", text: "yeah" },
      ],
    });
  });

  it("builds sections, comments and tabs; drops source comments and unknown directives", () => {
    expect(song.sections.map((s) => [s.type, s.label])).toEqual([
      ["none", null],
      ["chorus", "Coro final"],
      ["none", null],
      ["tab", null],
    ]);
    expect(song.sections[0].lines[0]).toEqual({ kind: "comment", text: "Intro suave" });
    expect(song.sections[2].lines).toEqual([{ kind: "comment", text: "Coro" }]);
    expect(song.sections[3].lines).toEqual([{ kind: "tab", text: "e|--0--|" }]);
    expect(JSON.stringify(song)).not.toContain("nota para mí");
    expect(JSON.stringify(song)).not.toContain("oculto");
  });

  it("finds the first chord", () => {
    expect(firstChord(song)).toBe("G");
    expect(firstChord(parseChordPro("sin acordes"))).toBeNull();
  });

  it("handles empty input", () => {
    expect(parseChordPro("").sections).toEqual([]);
  });
});
