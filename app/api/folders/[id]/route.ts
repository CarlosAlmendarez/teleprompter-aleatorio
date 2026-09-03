import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { folders } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";

const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentFolderId: z.uuid().nullable().optional(),
});

async function ownedFolder(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.ownerId, userId)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const existing = await ownedFolder(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateFolderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.parentFolderId) {
    if (parsed.data.parentFolderId === id) {
      return NextResponse.json({ error: "A folder cannot be its own parent" }, { status: 400 });
    }
    const parent = await ownedFolder(userId, parsed.data.parentFolderId);
    if (!parent) {
      return NextResponse.json({ error: "parentFolderId not found" }, { status: 404 });
    }
  }

  const [updated] = await db
    .update(folders)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.parentFolderId !== undefined
        ? { parentFolderId: parsed.data.parentFolderId }
        : {}),
    })
    .where(and(eq(folders.id, id), eq(folders.ownerId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const existing = await ownedFolder(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.ownerId, userId)));
  return new NextResponse(null, { status: 204 });
}
