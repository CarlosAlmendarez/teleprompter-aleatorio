import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, offlineCacheFlags } from "@/lib/db/schema";
import { getSetlist } from "@/lib/setlists/queries";
import { playerHref } from "@/lib/setlists/types";
import { blobUrlsOf } from "@/lib/blob/cleanup";
import type { OfflineManifest, OfflineTarget } from "./types";

export type { OfflineManifest, OfflineTarget };

function targetWhere(userId: string, target: OfflineTarget) {
  return and(
    eq(offlineCacheFlags.ownerId, userId),
    "documentId" in target
      ? eq(offlineCacheFlags.documentId, target.documentId)
      : eq(offlineCacheFlags.setlistId, target.setlistId),
  );
}

export async function isMarkedOffline(userId: string, target: OfflineTarget): Promise<boolean> {
  const [row] = await db
    .select({ id: offlineCacheFlags.id })
    .from(offlineCacheFlags)
    .where(targetWhere(userId, target))
    .limit(1);
  return Boolean(row);
}

export async function setMarkedOffline(userId: string, target: OfflineTarget, marked: boolean) {
  if (!marked) {
    await db.delete(offlineCacheFlags).where(targetWhere(userId, target));
    return;
  }
  if (await isMarkedOffline(userId, target)) return;
  await db.insert(offlineCacheFlags).values({ ownerId: userId, ...target });
}

/**
 * Expands the user's offline flags into the concrete URLs a device must cache:
 * each flagged document's viewer + player, and each flagged setlist's page +
 * every step's player (with setlist context), plus all PDFs involved.
 */
export async function getOfflineManifest(userId: string): Promise<OfflineManifest> {
  const flags = await db
    .select()
    .from(offlineCacheFlags)
    .where(eq(offlineCacheFlags.ownerId, userId));

  const pages = new Map<string, string>();
  const docIds = new Set<string>();

  for (const flag of flags) {
    if (flag.setlistId) {
      const setlist = await getSetlist(userId, flag.setlistId);
      if (!setlist) continue;
      pages.set(`/setlists/${setlist.id}`, `Setlist · ${setlist.name}`);
      setlist.items.forEach((item, i) => {
        pages.set(
          playerHref({ id: item.documentId, type: item.type }, { id: setlist.id, index: i }),
          `${setlist.name} · ${i + 1}. ${item.title}`,
        );
        docIds.add(item.documentId);
      });
    } else if (flag.documentId) {
      docIds.add(flag.documentId);
    }
  }

  const docs =
    docIds.size > 0
      ? await db
          .select()
          .from(documents)
          .where(and(eq(documents.ownerId, userId), inArray(documents.id, [...docIds])))
      : [];

  const pdfs = new Set<string>();
  const flaggedDocIds = new Set(flags.map((f) => f.documentId).filter(Boolean));
  for (const doc of docs) {
    blobUrlsOf(doc).forEach((url) => pdfs.add(url));
    if (flaggedDocIds.has(doc.id)) {
      pages.set(`/documents/${doc.id}`, doc.title);
      pages.set(playerHref(doc), `${doc.title} · reproductor`);
    }
  }

  return {
    pages: [...pages].map(([url, title]) => ({ url, title })),
    pdfs: [...pdfs],
  };
}
