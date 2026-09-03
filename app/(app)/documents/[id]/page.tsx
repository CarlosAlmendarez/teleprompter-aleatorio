import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DocumentEditor } from "@/components/library/DocumentEditor";
import type { DocumentRow } from "@/lib/types";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
    .limit(1);

  if (!doc) notFound();

  const serialized: DocumentRow = {
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  if (doc.type === "pdf" || doc.type === "musicxml") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold">{doc.title}</h1>
        <p className="max-w-sm text-sm text-zinc-500">
          El visor de {doc.type === "pdf" ? "PDF" : "MusicXML"} llega en el
          paso del Modo Partituras. Por ahora solo puedes crear su registro.
        </p>
      </div>
    );
  }

  return <DocumentEditor document={serialized} />;
}
