import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, folders } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { updateDocumentSchema } from "@/lib/api/document-schema";

async function ownedDocument(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const doc = await ownedDocument(userId, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  const { id } = await params;

  const existing = await ownedDocument(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateDocumentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.folderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, parsed.data.folderId), eq(folders.ownerId, userId)))
      .limit(1);
    if (!folder) {
      return NextResponse.json({ error: "folderId not found" }, { status: 404 });
    }
  }

  const { title, folderId, content, blobUrl, metadata } = parsed.data;
  const [updated] = await db
    .update(documents)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(folderId !== undefined ? { folderId } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(blobUrl !== undefined ? { blobUrl } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, id), eq(documents.ownerId, userId)))
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

  const existing = await ownedDocument(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.ownerId, userId)));
  return new NextResponse(null, { status: 204 });
}
