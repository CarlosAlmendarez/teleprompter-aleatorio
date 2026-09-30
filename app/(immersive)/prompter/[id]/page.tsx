import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getSetlistNav } from "@/lib/setlists/queries";
import { PrompterView } from "@/components/prompter/PrompterView";

export default async function PrompterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setlist?: string; i?: string; view?: string; link?: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)))
    .limit(1);

  if (!doc || (doc.type !== "text" && doc.type !== "chordpro")) notFound();

  const query = await searchParams;
  const setlistNav = await getSetlistNav(session.user.id, doc.id, query);
  // Operator mode: this window is the reader screen another window controls.
  const readerLinkId =
    query.view === "reader" && typeof query.link === "string" && /^[0-9a-f-]{36}$/i.test(query.link)
      ? query.link
      : null;

  return (
    <PrompterView
      documentId={doc.id}
      format={doc.type === "chordpro" ? "chordpro" : "text"}
      metadata={doc.metadata}
      title={doc.title}
      content={doc.content ?? ""}
      backHref={setlistNav?.backHref ?? `/documents/${doc.id}`}
      setlistNav={setlistNav}
      readerLinkId={readerLinkId}
      pdfUrl={doc.metadata?.pdf?.url ?? null}
    />
  );
}
