import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { setlistItems, setlists, type SetlistItemOverrides } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { setlistOverridesPatchSchema } from "@/lib/api/document-schema";

const patchSchema = z.object({ overrides: setlistOverridesPatchSchema });

const idSchema = z.uuid();

/** Merges settings into one setlist step (saved from the player). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id, itemId } = await params;
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(itemId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .select({ overrides: setlistItems.overrides })
    .from(setlistItems)
    .innerJoin(setlists, eq(setlists.id, setlistItems.setlistId))
    .where(and(eq(setlistItems.id, itemId), eq(setlistItems.setlistId, id), eq(setlists.ownerId, userId)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merged: Record<string, unknown> = { ...(row.overrides ?? {}) };
  for (const [key, value] of Object.entries(parsed.data.overrides)) {
    if (value === null) delete merged[key];
    else if (value !== undefined) merged[key] = value;
  }

  const [updated] = await db
    .update(setlistItems)
    .set({ overrides: merged as SetlistItemOverrides })
    .where(eq(setlistItems.id, itemId))
    .returning({ overrides: setlistItems.overrides });

  return NextResponse.json(updated);
}
