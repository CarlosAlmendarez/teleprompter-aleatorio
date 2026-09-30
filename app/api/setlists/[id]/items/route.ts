import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, setlistItems, setlists } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { getSetlist } from "@/lib/setlists/queries";
import { setlistOverridesSchema } from "@/lib/api/document-schema";

// Positions are stored with gaps; replacing the whole list rewrites them as
// multiples of this step, so a later single-item insert can slot in between.
const POSITION_STEP = 1000;

const replaceItemsSchema = z.object({
  items: z
    .array(z.object({ documentId: z.uuid(), overrides: setlistOverridesSchema.optional() }))
    .max(500),
});

/** Replaces the setlist's ordered items (add / remove / reorder in one call). */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const parsed = replaceItemsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items } = parsed.data;
  const documentIds = items.map((item) => item.documentId);

  const setlist = await getSetlist(userId, id);
  if (!setlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unique = [...new Set(documentIds)];
  if (unique.length > 0) {
    const owned = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.ownerId, userId), inArray(documents.id, unique)));
    if (owned.length !== unique.length) {
      return NextResponse.json({ error: "Unknown documentId" }, { status: 404 });
    }
  }

  // One batch is one transaction on neon-http, so the list is never half-written.
  const clear = db.delete(setlistItems).where(eq(setlistItems.setlistId, id));
  const touch = db.update(setlists).set({ updatedAt: new Date() }).where(eq(setlists.id, id));
  if (documentIds.length > 0) {
    const insert = db.insert(setlistItems).values(
      items.map((item, i) => ({
        setlistId: id,
        documentId: item.documentId,
        position: (i + 1) * POSITION_STEP,
        overrides: item.overrides ?? {},
      })),
    );
    await db.batch([clear, insert, touch]);
  } else {
    await db.batch([clear, touch]);
  }

  return NextResponse.json(await getSetlist(userId, id));
}
