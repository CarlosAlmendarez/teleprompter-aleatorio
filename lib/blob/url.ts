const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

/** True for URLs served from a Vercel Blob store (the only PDFs we host). */
export function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}
