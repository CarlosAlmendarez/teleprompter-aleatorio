import { del } from "@vercel/blob";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, type DocumentMetadata } from "@/lib/db/schema";
import { isBlobUrl } from "./url";

// Removes Vercel Blob files (imported PDFs, attached PDFs) once no document
// points at them any more, so deleting or replacing a PDF doesn't leave the
// file billing storage forever.

/** Every blob URL a document row references. */
export function blobUrlsOf(doc: {
  blobUrl: string | null;
  metadata: DocumentMetadata | null;
}): string[] {
  return [doc.blobUrl, doc.metadata?.pdf?.url].filter(
    (url): url is string => typeof url === "string" && isBlobUrl(url),
  );
}

/**
 * Deletes each URL from Blob storage unless some document — of any user —
 * still references it. The cross-user check is what makes this safe: a user
 * who copies someone else's blob URL into their own document and then deletes
 * it can never remove a file another document relies on. Best-effort: a
 * failure is logged, never surfaced to the request that triggered it.
 */
export async function deleteUnreferencedBlobs(urls: string[]): Promise<void> {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return;
  try {
    const orphaned: string[] = [];
    for (const url of unique) {
      const [row] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(or(eq(documents.blobUrl, url), sql`${documents.metadata}->'pdf'->>'url' = ${url}`))
        .limit(1);
      if (!row) orphaned.push(url);
    }
    if (orphaned.length > 0) {
      await del(orphaned, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }
  } catch (error) {
    console.error("Blob cleanup failed", error);
  }
}
