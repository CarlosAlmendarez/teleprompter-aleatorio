import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { folders } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentFolderId: z.uuid().nullable().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const rows = await db
    .select()
    .from(folders)
    .where(eq(folders.ownerId, userId))
    .orderBy(folders.name);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = createFolderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.parentFolderId) {
    const [parent] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(
        and(
          eq(folders.id, parsed.data.parentFolderId),
          eq(folders.ownerId, userId),
        ),
      )
      .limit(1);
    if (!parent) {
      return NextResponse.json({ error: "parentFolderId not found" }, { status: 404 });
    }
  }

  const [created] = await db
    .insert(folders)
    .values({
      ownerId: userId,
      name: parsed.data.name,
      parentFolderId: parsed.data.parentFolderId ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
