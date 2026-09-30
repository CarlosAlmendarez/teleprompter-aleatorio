import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSetlist } from "@/lib/setlists/queries";
import { SetlistEditor } from "@/components/setlists/SetlistEditor";

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;

  const setlist = await getSetlist(session.user.id, id);
  if (!setlist) notFound();

  return <SetlistEditor setlist={setlist} />;
}
