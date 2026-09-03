import { LibraryBrowser } from "@/components/library/LibraryBrowser";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <LibraryBrowser folderId={folderId} />;
}
