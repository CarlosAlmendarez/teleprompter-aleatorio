import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DocumentEditor } from "@/components/library/DocumentEditor";
import { DocumentViewerHeader } from "@/components/library/DocumentViewerHeader";
import { ChordChart } from "@/components/scores/ChordChart";
import { LyricsEditor } from "@/components/scores/LyricsEditor";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";
import { availableMeasureNumbers } from "@/lib/musicxml/parseLyricChart";
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
          extra={
            <Link
              href={`/scores/${doc.id}`}
              className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              ▶ Reproducir
            </Link>
          }
        />
        <ChordChart data={chartData} />
        <LyricsEditor
          documentId={doc.id}
          metadata={doc.metadata}
          measureNumbers={availableMeasureNumbers(chartData.measures)}
        />
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
