import { describe, expect, it } from "vitest";
import { actionForKey, bindKey, keyLabel } from "./pedal";

describe("pedal bindings", () => {
  it("finds the action bound to a key", () => {
    expect(actionForKey({ forward: "PageDown", back: "PageUp" }, "PageUp")).toBe("back");
    expect(actionForKey({ forward: "PageDown" }, "KeyX")).toBeNull();
  });

  it("moves a key to the new action instead of binding it twice", () => {
    expect(bindKey({ forward: "PageDown", back: "PageUp" }, "toggle", "PageDown")).toEqual({
      back: "PageUp",
      toggle: "PageDown",
    });
  });

  it("labels keys for people", () => {
    expect(keyLabel("PageDown")).toBe("AvPág");
    expect(keyLabel("KeyB")).toBe("B");
    expect(keyLabel("Digit3")).toBe("3");
    expect(keyLabel(undefined)).toBe("—");
  });
});
