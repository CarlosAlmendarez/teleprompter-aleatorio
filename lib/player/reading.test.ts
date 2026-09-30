import { describe, expect, it } from "vitest";
import { DEFAULT_READING, sanitizeReading } from "./reading";

describe("sanitizeReading", () => {
  it("falls back to defaults for missing or bad values", () => {
    expect(sanitizeReading(null)).toEqual(DEFAULT_READING);
    expect(sanitizeReading({ font: "comic", theme: "neon", lineHeight: "big" })).toEqual(DEFAULT_READING);
  });

  it("clamps numbers into range", () => {
    const prefs = sanitizeReading({ lineHeight: 9, margin: -3, guide: { position: 99, thickness: 0, show: false } });
    expect(prefs.lineHeight).toBe(2.4);
    expect(prefs.margin).toBe(0);
    expect(prefs.guide).toEqual({ show: false, position: 80, thickness: 1 });
  });
});
