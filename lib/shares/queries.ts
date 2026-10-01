import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, setlistShares, setlists } from "@/lib/db/schema";
import { getSetlist } from "@/lib/setlists/queries";
import type { SetlistDetail, SetlistNav } from "@/lib/setlists/types";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

/** 32 URL-safe characters (192 random bits): unguessable, short enough to share. */
export function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function shareHref(token: string, index?: number): string {
  return index === undefined ? `/s/${token}` : `/s/${token}/${index}`;
}

/** The setlist behind a live (unexpired) share token, or null. */
export async function getSharedSetlist(token: string): Promise<SetlistDetail | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select({ setlistId: setlistShares.setlistId, ownerId: setlists.ownerId })
    .from(setlistShares)
    .innerJoin(setlists, eq(setlists.id, setlistShares.setlistId))
    .where(
      and(
        eq(setlistShares.token, token),
        or(isNull(setlistShares.expiresAt), gt(setlistShares.expiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!row) return null;
  return getSetlist(row.ownerId, row.setlistId);
}

/** One step of a shared setlist: its document plus prev/next links within the share. */
export async function getSharedStep(token: string, index: number) {
  const setlist = await getSharedSetlist(token);
  const item = setlist?.items[index];
  if (!setlist || !item) return null;

  const [doc] = await db.select().from(documents).where(eq(documents.id, item.documentId)).limit(1);
  if (!doc) return null;

  const link = (i: number) => {
    const step = setlist.items[i];
    return step ? { title: step.title, href: shareHref(token, i) } : null;
  };
  const nav: SetlistNav = {
    setlistId: setlist.id,
    itemId: item.id,
    overrides: item.overrides,
    name: setlist.name,
    index,
    total: setlist.items.length,
    backHref: shareHref(token),
    prev: link(index - 1),
    next: link(index + 1),
  };
  return { setlist, doc, nav };
}
