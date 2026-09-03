"use client";

import { useRouter } from "next/navigation";

export function DocumentViewerHeader({
  documentId,
  title,
  folderId,
  extra,
}: {
  documentId: string;
  title: string;
  folderId: string | null;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const backHref = folderId ? `/folders/${folderId}` : "/dashboard";

  async function handleDelete() {
    if (!window.confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    router.push(backHref);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => router.push(backHref)}
          title="Volver"
          className="whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          ← Volver
        </button>
        <h1 className="truncate text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <button
          onClick={handleDelete}
          className="whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 dark:border-white/15"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
