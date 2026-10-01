import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedStep } from "@/lib/shares/queries";
import { PrompterView } from "@/components/prompter/PrompterView";
import { ChordChartPlayer } from "@/components/scores/ChordChartPlayer";
import { PdfPlayer } from "@/components/pdf/PdfPlayer";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";
import { parseLyricSegments } from "@/lib/musicxml/parseLyricChart";

export const metadata: Metadata = { title: "Setlist compartido", robots: { index: false, follow: false } };

/** A step of a shared setlist, in its read-only player. */
export default async function SharedStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; index: string }>;
  searchParams: Promise<{ view?: string; link?: string }>;
}) {
  const { token, index } = await params;
  const step = /^\d+$/.test(index) ? await getSharedStep(token, Number(index)) : null;
  if (!step) notFound();
  const { doc, nav } = step;
  const query = await searchParams;
  const readerLinkId =
    query.view === "reader" && typeof query.link === "string" && /^[0-9a-f-]{36}$/i.test(query.link)
      ? query.link
      : null;

  if (doc.type === "musicxml") {
    const chart = parseChordChart(doc.content ?? "");
    return (
      <ChordChartPlayer
        readOnly
        documentId={doc.id}
        metadata={doc.metadata}
        title={chart.title ?? doc.title}
        data={chart}
        lyricSegments={parseLyricSegments(doc.metadata?.lyrics ?? "", chart.measures)}
        backHref={nav.backHref}
        setlistNav={nav}
        pdf={doc.metadata?.pdf ?? null}
      />
    );
  }
  if (doc.type === "pdf") {
    if (!doc.blobUrl) notFound();
    return <PdfPlayer title={doc.title} url={doc.blobUrl} backHref={nav.backHref} setlistNav={nav} />;
  }
  return (
    <PrompterView
      readOnly
      documentId={doc.id}
      format={doc.type === "chordpro" ? "chordpro" : "text"}
      metadata={doc.metadata}
      title={doc.title}
      content={doc.content ?? ""}
      backHref={nav.backHref}
      setlistNav={nav}
      readerLinkId={readerLinkId}
      pdfUrl={doc.metadata?.pdf?.url ?? null}
    />
  );
}
