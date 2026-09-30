import { describe, expect, it } from "vitest";
import { playerHref } from "./types";

describe("playerHref", () => {
  it("routes each document type to its immersive player", () => {
    expect(playerHref({ id: "a", type: "text" })).toBe("/prompter/a");
    expect(playerHref({ id: "b", type: "chordpro" })).toBe("/prompter/b");
    expect(playerHref({ id: "c", type: "musicxml" })).toBe("/scores/c");
    expect(playerHref({ id: "d", type: "pdf" })).toBe("/pdf/d");
  });

  it("carries setlist context in the query string", () => {
    expect(playerHref({ id: "c", type: "musicxml" }, { id: "s1", index: 2 })).toBe("/scores/c?setlist=s1&i=2");
  });
});
