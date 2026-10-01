import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { setlistShares } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { getSetlist } from "@/lib/setlists/queries";

/** Revokes a read-only link: it stops working immediately. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id, shareId } = await params;
  if (!z.uuid().safeParse(shareId).success || !(await getSetlist(userId, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [deleted] = await db
    .delete(setlistShares)
    .where(and(eq(setlistShares.id, shareId), eq(setlistShares.setlistId, id)))
    .returning({ id: setlistShares.id });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
