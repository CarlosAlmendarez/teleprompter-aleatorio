import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { ChordChartPlayer } from "@/components/scores/ChordChartPlayer";
import { parseChordChart } from "@/lib/musicxml/parseChordChart";

export default async function ScorePlayerPage({
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

  if (!doc || doc.type !== "musicxml") notFound();

  const chartData = parseChordChart(doc.content ?? "");

  return (
    <ChordChartPlayer
      title={chartData.title ?? doc.title}
      data={chartData}
      backHref={`/documents/${doc.id}`}
    />
  );
}
