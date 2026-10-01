import { describe, expect, it } from "vitest";
import { extensionFor, pickMimeType, recordingFileName } from "./recorder";

describe("recorder helpers", () => {
  it("prefers VP9 WebM, falls back to MP4 (Safari), or nothing", () => {
    expect(pickMimeType(() => true)).toBe("video/webm;codecs=vp9,opus");
    expect(pickMimeType((t) => t.startsWith("video/mp4"))).toBe("video/mp4;codecs=avc1,mp4a");
    expect(pickMimeType(() => false)).toBeNull();
  });

  it("maps types to file extensions", () => {
    expect(extensionFor("video/webm;codecs=vp8,opus")).toBe("webm");
    expect(extensionFor("video/mp4")).toBe("mp4");
  });

  it("names files from the title and local time", () => {
    const date = new Date(2026, 8, 30, 14, 5);
    expect(recordingFileName("Discurso de Apertura!", date, "webm")).toBe("discurso-de-apertura-2026-09-30-1405.webm");
    expect(recordingFileName("¿¿??", date, "mp4")).toBe("grabacion-2026-09-30-1405.mp4");
  });
});
