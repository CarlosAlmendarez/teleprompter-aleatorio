import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { isResponse, requireUserId } from "@/lib/api/require-user";
import { getSetlist } from "@/lib/setlists/queries";
import { getOfflineManifest, setMarkedOffline, type OfflineTarget } from "@/lib/offline/queries";

const targetSchema = z.union([
  z.object({ documentId: z.uuid() }).strict(),
  z.object({ setlistId: z.uuid() }).strict(),
]);

/** URLs this user's devices should keep available offline. */
export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;
  return NextResponse.json(await getOfflineManifest(userId));
}

async function ownsTarget(userId: string, target: OfflineTarget): Promise<boolean> {
  if ("setlistId" in target) return (await getSetlist(userId, target.setlistId)) !== null;
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, target.documentId), eq(documents.ownerId, userId)))
    .limit(1);
  return Boolean(doc);
}

async function handle(req: Request, marked: boolean) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const parsed = targetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await ownsTarget(userId, parsed.data))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await setMarkedOffline(userId, parsed.data, marked);
  return NextResponse.json({ marked });
}

/** Marks a document or setlist for offline use. */
export function POST(req: Request) {
  return handle(req, true);
}

/** Unmarks a document or setlist. */
export function DELETE(req: Request) {
  return handle(req, false);
}
