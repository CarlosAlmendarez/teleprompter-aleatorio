import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { PdfPlayer } from "@/components/pdf/PdfPlayer";
import { getSetlistNav } from "@/lib/setlists/queries";

export default async function PdfPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setlist?: string; i?: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
    .limit(1);

  if (!doc || doc.type !== "pdf" || !doc.blobUrl) notFound();

  const setlistNav = await getSetlistNav(session.user.id, doc.id, await searchParams);

  return (
    <PdfPlayer
      title={doc.title}
      url={doc.blobUrl}
      backHref={setlistNav?.backHref ?? `/documents/${doc.id}`}
      setlistNav={setlistNav}
    />
  );
}
