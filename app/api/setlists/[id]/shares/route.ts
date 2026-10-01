import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { setlistShares } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { getSetlist } from "@/lib/setlists/queries";
import { newShareToken } from "@/lib/shares/queries";

const createShareSchema = z.object({
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).nullable(),
});

/** The setlist's read-only links. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!(await getSetlist(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(setlistShares)
    .where(eq(setlistShares.setlistId, id))
    .orderBy(desc(setlistShares.createdAt));
  return NextResponse.json(rows);
}

/** Creates a read-only link, optionally expiring after 1, 7 or 30 days. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;
  if (!(await getSetlist(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = createShareSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const days = parsed.data.expiresInDays;
  const [created] = await db
    .insert(setlistShares)
    .values({
      setlistId: id,
      token: newShareToken(),
      expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
