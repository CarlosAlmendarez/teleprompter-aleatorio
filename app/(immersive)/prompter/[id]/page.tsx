import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { PrompterView } from "@/components/prompter/PrompterView";

export default async function PrompterPage({
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

  if (!doc || (doc.type !== "text" && doc.type !== "chordpro")) notFound();

  return (
    <PrompterView
      title={doc.title}
      content={doc.content ?? ""}
      backHref={`/documents/${doc.id}`}
    />
  );
}
