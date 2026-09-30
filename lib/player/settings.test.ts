import { describe, expect, it } from "vitest";
import { resolvePlayerSettings, toMetadataPatch, toOverridesPatch } from "./settings";

describe("resolvePlayerSettings", () => {
  const metadata = { playback: { speed: 60, fontSize: 48, position: 0.4 }, transpose: 2, capo: 1 };

  it("uses the document's settings outside a setlist", () => {
    expect(resolvePlayerSettings(metadata, null)).toEqual({
      speed: 60,
      fontSize: 48,
      position: 0.4,
      transpose: 2,
      capo: 1,
    });
  });

  it("lets setlist overrides win and never restores the position", () => {
    expect(resolvePlayerSettings(metadata, { speed: 80, transpose: -1, transitionNote: "x" })).toEqual({
      speed: 80,
      fontSize: 48,
      transpose: -1,
      capo: 1,
    });
  });

  it("handles missing metadata", () => {
    expect(resolvePlayerSettings(null, undefined)).toEqual({});
  });
});

describe("patch builders", () => {
  it("sends the whole playback object plus top-level transpose/capo", () => {
    expect(toMetadataPatch({ speed: 70, transpose: 3 }, { fontSize: 40, position: 0.2 })).toEqual({
      patch: { playback: { fontSize: 40, position: 0.2, speed: 70 }, transpose: 3 },
      playback: { fontSize: 40, position: 0.2, speed: 70 },
    });
  });

  it("omits playback when only the key changed", () => {
    expect(toMetadataPatch({ capo: 2 }, { speed: 40 }).patch).toEqual({ capo: 2 });
  });

  it("drops position from setlist overrides", () => {
    expect(toOverridesPatch({ position: 0.5, mirror: true })).toEqual({ mirror: true });
  });
});
