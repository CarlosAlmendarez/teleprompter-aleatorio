import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { setlists } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { getSetlist } from "@/lib/setlists/queries";

const updateSetlistSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  kind: z.enum(["music_set", "script_sequence"]).optional(),
});

const idSchema = z.uuid();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const setlist = await getSetlist(userId, id);
  if (!setlist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(setlist);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateSetlistSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(setlists)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(setlists.id, id), eq(setlists.ownerId, userId)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deleted] = await db
    .delete(setlists)
    .where(and(eq(setlists.id, id), eq(setlists.ownerId, userId)))
    .returning({ id: setlists.id });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
