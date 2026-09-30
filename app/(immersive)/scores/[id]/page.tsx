import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSetlistNav } from "@/lib/setlists/queries";
import { ChordChartPlayer } from "@/components/scores/ChordChartPlayer";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";
import { parseLyricSegments } from "@/lib/musicxml/parseLyricChart";

export default async function ScorePlayerPage({
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

  if (!doc || doc.type !== "musicxml") notFound();

  const setlistNav = await getSetlistNav(session.user.id, doc.id, await searchParams);

  const chartData = parseChordChart(doc.content ?? "");
  const lyricSegments = parseLyricSegments(doc.metadata?.lyrics ?? "", chartData.measures);

  return (
    <ChordChartPlayer
      documentId={doc.id}
      metadata={doc.metadata}
      title={chartData.title ?? doc.title}
      data={chartData}
      lyricSegments={lyricSegments}
      backHref={setlistNav?.backHref ?? `/documents/${doc.id}`}
      setlistNav={setlistNav}
      pdf={doc.metadata?.pdf ?? null}
    />
  );
}
