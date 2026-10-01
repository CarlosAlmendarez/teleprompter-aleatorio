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
import { PdfSyncEditor } from "@/components/scores/PdfSyncEditor";
import { SyncedPdfPane } from "@/components/pdf/SyncedPdfPane";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";
import { availableMeasureNumbers } from "@/lib/musicxml/parseLyricChart";
import type { DocumentRow } from "@/lib/types";
import { OfflineToggle } from "@/components/offline/OfflineToggle";
import { isMarkedOffline } from "@/lib/offline/queries";

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

  const offlineToggle = (
    <OfflineToggle
      target={{ documentId: doc.id }}
      initialMarked={await isMarkedOffline(session.user.id, { documentId: doc.id })}
    />
  );

  const serialized: DocumentRow = {
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  if (doc.type === "musicxml") {
    const chartData = parseChordChart(doc.content ?? "");
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <DocumentViewerHeader
          documentId={doc.id}
          title={chartData.title ?? doc.title}
          folderId={doc.folderId}
          extra={
            <>
              {offlineToggle}
              <Link
                href={`/scores/${doc.id}`}
                className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                ▶ Reproducir
              </Link>
            </>
          }
        />
        <ChordChart
          data={chartData}
          transpose={doc.metadata?.transpose ?? 0}
          capo={doc.metadata?.capo ?? 0}
        />
        <LyricsEditor
          documentId={doc.id}
          metadata={doc.metadata}
          measureNumbers={availableMeasureNumbers(chartData.written)}
        />
        <PdfSyncEditor
          documentId={doc.id}
          metadata={doc.metadata}
          measureNumbers={availableMeasureNumbers(chartData.written)}
          withAnchors
        />
      </div>
    );
  }

  if (doc.type === "pdf") {
    return (
      <div className="flex flex-1 flex-col">
        <DocumentViewerHeader
          documentId={doc.id}
          title={doc.title}
          folderId={doc.folderId}
          extra={
            doc.blobUrl ? (
              <>
                {offlineToggle}
                <Link
                  href={`/pdf/${doc.id}`}
                  className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  ⛶ Pantalla completa
                </Link>
              </>
            ) : undefined
          }
        />
        {doc.blobUrl ? (
          <div className="flex min-h-[24rem] flex-1 flex-col [height:calc(100dvh-9rem)]">
            <SyncedPdfPane url={doc.blobUrl} interactive className="flex-1" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="max-w-sm text-sm text-zinc-500">
              Este documento PDF no tiene archivo asociado. Vuelve a importarlo
              desde la biblioteca.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <DocumentEditor document={serialized} headerExtra={offlineToggle} />
      <div className="mx-auto w-full max-w-6xl">
        <PdfSyncEditor documentId={doc.id} metadata={doc.metadata} />
      </div>
    </div>
  );
}
