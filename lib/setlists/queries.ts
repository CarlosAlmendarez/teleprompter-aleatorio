import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, setlistItems, setlists } from "@/lib/db/schema";
import { playerHref, type SetlistDetail, type SetlistNav } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSetlist(userId: string, id: string): Promise<SetlistDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const [setlist] = await db
    .select()
    .from(setlists)
    .where(and(eq(setlists.id, id), eq(setlists.ownerId, userId)))
    .limit(1);
  if (!setlist) return null;

  const items = await db
    .select({
      id: setlistItems.id,
      documentId: setlistItems.documentId,
      position: setlistItems.position,
      title: documents.title,
      type: documents.type,
    })
    .from(setlistItems)
    .innerJoin(documents, eq(documents.id, setlistItems.documentId))
    .where(eq(setlistItems.setlistId, id))
    .orderBy(asc(setlistItems.position));

  return {
    id: setlist.id,
    name: setlist.name,
    kind: setlist.kind,
    updatedAt: setlist.updatedAt.toISOString(),
    items,
  };
}

/**
 * Resolves prev/next context for playing item `i` of a setlist, or null when
 * the search params don't describe a valid position holding `documentId`.
 */
export async function getSetlistNav(
  userId: string,
  documentId: string,
  searchParams: { setlist?: string | string[]; i?: string | string[] },
): Promise<SetlistNav | null> {
  const setlistId = typeof searchParams.setlist === "string" ? searchParams.setlist : null;
  const index = Number(typeof searchParams.i === "string" ? searchParams.i : NaN);
  if (!setlistId || !Number.isInteger(index)) return null;

  const setlist = await getSetlist(userId, setlistId);
  if (!setlist || setlist.items[index]?.documentId !== documentId) return null;

  const link = (i: number) => {
    const item = setlist.items[i];
    if (!item) return null;
    return {
      title: item.title,
      href: playerHref({ id: item.documentId, type: item.type }, { id: setlist.id, index: i }),
    };
  };

  return {
    name: setlist.name,
    index,
    total: setlist.items.length,
    backHref: `/setlists/${setlist.id}`,
    prev: link(index - 1),
    next: link(index + 1),
  };
}
