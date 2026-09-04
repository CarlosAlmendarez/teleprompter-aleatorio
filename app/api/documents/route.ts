import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, folders } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { createDocumentSchema } from "@/lib/api/document-schema";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");

  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.ownerId, userId),
        folderId === "root"
          ? isNull(documents.folderId)
          : folderId
            ? eq(documents.folderId, folderId)
            : undefined,
      ),
    )
    .orderBy(documents.title);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = createDocumentSchema.safeParse(await req.json().catch(() => null));
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

  const [created] = await db
    .insert(documents)
    .values({
      ownerId: userId,
      folderId: parsed.data.folderId ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      blobUrl: parsed.data.blobUrl ?? null,
      metadata: parsed.data.metadata ?? {},
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
