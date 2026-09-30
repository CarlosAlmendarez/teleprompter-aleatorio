import { NextResponse } from "next/server";
import { z } from "zod";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { setlistItems, setlists } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";

const createSetlistSchema = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["music_set", "script_sequence"]),
});

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const rows = await db
    .select({
      id: setlists.id,
      name: setlists.name,
      kind: setlists.kind,
      updatedAt: setlists.updatedAt,
      itemCount: count(setlistItems.id),
    })
    .from(setlists)
    .leftJoin(setlistItems, eq(setlistItems.setlistId, setlists.id))
    .where(eq(setlists.ownerId, userId))
    .groupBy(setlists.id)
    .orderBy(desc(setlists.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = createSetlistSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(setlists)
    .values({ ownerId: userId, ...parsed.data })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
