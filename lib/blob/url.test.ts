import { describe, expect, it } from "vitest";
import { isBlobUrl } from "./url";

describe("isBlobUrl", () => {
  it("accepts Vercel Blob store URLs", () => {
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/partitura-x1Y2.pdf")).toBe(true);
  });

  it("rejects other hosts, look-alikes, plain http and junk", () => {
    expect(isBlobUrl("https://example.com/file.pdf")).toBe(false);
    expect(isBlobUrl("https://blob.vercel-storage.com.evil.com/file.pdf")).toBe(false);
    expect(isBlobUrl("https://evilblob.vercel-storage.com/file.pdf")).toBe(false);
    expect(isBlobUrl("http://abc.public.blob.vercel-storage.com/file.pdf")).toBe(false);
    expect(isBlobUrl("no es una url")).toBe(false);
  });
});
