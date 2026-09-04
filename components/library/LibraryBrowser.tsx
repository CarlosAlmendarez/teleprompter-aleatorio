"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentRow, DocumentType, FolderRow } from "@/lib/types";
import { uploadPdf } from "@/lib/pdf/upload-client";

const MUSICXML_EXTENSIONS = [".musicxml", ".xml"];

const TYPE_LABEL: Record<DocumentType, string> = {
  text: "Texto",
  chordpro: "ChordPro",
  pdf: "PDF",
  musicxml: "MusicXML",
};

export function LibraryBrowser({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    const [foldersRes, documentsRes] = await Promise.all([
      fetch("/api/folders"),
      fetch(`/api/documents?folderId=${folderId ?? "root"}`),
    ]);
    setAllFolders(await foldersRes.json());
    setDocuments(await documentsRes.json());
    setLoading(false);
  }

  // Client-side fetch on navigation: will be swapped for an IndexedDB-backed
  // read once the offline cache layer lands, so no data-fetching library here.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh();
  }, [folderId]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const subFolders = allFolders.filter((f) => f.parentFolderId === folderId);
  const breadcrumb: FolderRow[] = [];
  let cursor = allFolders.find((f) => f.id === folderId) ?? null;
  while (cursor) {
    breadcrumb.unshift(cursor);
    cursor = allFolders.find((f) => f.id === cursor!.parentFolderId) ?? null;
  }

  async function createFolder() {
    const name = window.prompt("Nombre de la carpeta");
    if (!name) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentFolderId: folderId }),
    });
    refresh();
  }

  async function createDocument(type: DocumentType) {
    const title = window.prompt(`Título del ${TYPE_LABEL[type].toLowerCase()}`);
    if (!title) return;
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, folderId, content: "" }),
    });
    const created: DocumentRow = await res.json();
    router.push(`/documents/${created.id}`);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf");
    const isMusicXml = MUSICXML_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    setImporting(true);
    try {
      if (isPdf) {
        const title = file.name.replace(/\.pdf$/i, "") || "Sin título";
        const blobUrl = await uploadPdf(file);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "pdf", title, folderId, blobUrl }),
        });
        if (!res.ok) {
          window.alert("No se pudo importar el PDF.");
          return;
        }
        const created: DocumentRow = await res.json();
        router.push(`/documents/${created.id}`);
        return;
      }

      const type: DocumentType = isMusicXml ? "musicxml" : "text";
      const text = await file.text();
      const workTitle = isMusicXml
        ? text.match(/<work-title>\s*([\s\S]*?)\s*<\/work-title>/)?.[1]
        : null;
      const title =
        workTitle || file.name.replace(/\.(txt|musicxml|xml)$/i, "") || "Sin título";

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, folderId, content: text }),
      });
      if (!res.ok) {
        window.alert("No se pudo importar el archivo.");
        return;
      }
      const created: DocumentRow = await res.json();
      router.push(`/documents/${created.id}`);
    } catch {
      window.alert("No se pudo importar el archivo.");
    } finally {
      setImporting(false);
    }
  }

  async function deleteFolder(id: string) {
    if (!window.confirm("¿Eliminar esta carpeta y todo su contenido?")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    refresh();
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Biblioteca
        </Link>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span>/</span>
            <Link
              href={`/folders/${f.id}`}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {f.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={createFolder}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          + Carpeta
        </button>
        <button
          onClick={() => createDocument("text")}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          + Guion / Texto
        </button>
        <button
          onClick={() => createDocument("chordpro")}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          + ChordPro
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.musicxml,.xml,.pdf"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          {importing ? "Importando…" : "⇪ Importar archivo (.txt / .musicxml / .pdf)"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {subFolders.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Carpetas
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {subFolders.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                  >
                    <Link href={`/folders/${f.id}`} className="flex-1 truncate">
                      📁 {f.name}
                    </Link>
                    <button
                      onClick={() => deleteFolder(f.id)}
                      className="ml-2 text-xs text-zinc-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                      aria-label="Eliminar carpeta"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Documentos
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay documentos en esta carpeta todavía.</p>
            ) : (
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-center justify-between py-2 text-sm"
                  >
                    <Link href={`/documents/${doc.id}`} className="flex-1 truncate">
                      <span className="mr-2 rounded bg-black/5 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-white/10">
                        {TYPE_LABEL[doc.type]}
                      </span>
                      {doc.title}
                    </Link>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="ml-2 text-xs text-zinc-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                      aria-label="Eliminar documento"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
