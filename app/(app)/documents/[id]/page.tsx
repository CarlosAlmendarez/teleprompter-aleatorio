import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DocumentEditor } from "@/components/library/DocumentEditor";
import { DocumentViewerHeader } from "@/components/library/DocumentViewerHeader";
import { ChordChart } from "@/components/scores/ChordChart";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";
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

  if (doc.type === "musicxml") {
    const chartData = parseChordChart(doc.content ?? "");
    return (
      <div className="flex flex-1 flex-col">
        <DocumentViewerHeader
          documentId={doc.id}
          title={chartData.title ?? doc.title}
          folderId={doc.folderId}
        />
        <ChordChart data={chartData} />
      </div>
    );
  }

  if (doc.type === "pdf") {
    return (
      <div className="flex flex-1 flex-col">
        <DocumentViewerHeader documentId={doc.id} title={doc.title} folderId={doc.folderId} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500">
            El visor de PDF llega en el paso del Modo Partituras. Por ahora
            solo puedes crear su registro.
          </p>
        </div>
      </div>
    );
  }

  return <DocumentEditor document={serialized} />;
}
