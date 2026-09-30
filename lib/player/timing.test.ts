import { describe, expect, it } from "vitest";
import { formatClock, paceDelta, parseClock, remainingSeconds } from "./timing";

describe("timing", () => {
  it("formats clocks", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(-12)).toBe("−0:12");
  });

  it("parses clocks", () => {
    expect(parseClock("3:40")).toBe(220);
    expect(parseClock("90")).toBe(90);
    expect(parseClock("1:02:03")).toBe(3723);
    expect(parseClock("3:4x")).toBeNull();
    expect(parseClock("0")).toBeNull();
  });

  it("estimates the time left at the current speed", () => {
    expect(remainingSeconds(0.5, 4000, 40)).toBe(50);
    expect(remainingSeconds(1, 4000, 40)).toBe(0);
    expect(remainingSeconds(0.5, 4000, 0)).toBeNull();
  });

  it("measures pace against a target", () => {
    // halfway through a 4-minute target after 1:48 → 12 s ahead
    expect(paceDelta(0.5, 108, 240)).toBeCloseTo(12);
    expect(paceDelta(0.25, 120, 240)).toBeCloseTo(-60);
    expect(paceDelta(0.5, 100, 0)).toBe(0);
  });
});
