"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentRow, DocumentType, FolderRow } from "@/lib/types";
import { uploadPdf } from "@/lib/pdf/upload-client";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialog";
import { TYPE_LABEL, TYPE_STYLE } from "./documentTypes";

const MUSICXML_EXTENSIONS = [".musicxml", ".xml"];
const ACCEPTED_EXTENSIONS = [".txt", ".pdf", ...MUSICXML_EXTENSIONS];

type SortMode = "name" | "recent";

type DialogState =
  | { kind: "none" }
  | { kind: "folder" }
  | { kind: "document"; type: DocumentType }
  | { kind: "delete-folder"; folder: FolderRow }
  | { kind: "delete-document"; document: DocumentRow };

const relativeTime = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function formatUpdated(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return "hace un momento";
  if (abs < 3600) return relativeTime.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeTime.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return relativeTime.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function LibraryBrowser({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("name");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  async function refresh() {
    setLoading(true);
    try {
      const [foldersRes, documentsRes] = await Promise.all([
        fetch("/api/folders"),
        fetch(`/api/documents?folderId=${folderId ?? "root"}`),
      ]);
      setAllFolders(await readJson<FolderRow[]>(foldersRes));
      setDocuments(await readJson<DocumentRow[]>(documentsRes));
      setError(null);
    } catch {
      setError("No se pudo cargar la biblioteca. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // Client-side fetch on navigation: will be swapped for an IndexedDB-backed
  // read once the offline cache layer lands, so no data-fetching library here.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    setQuery("");
    refresh();
  }, [folderId]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const currentFolder = allFolders.find((f) => f.id === folderId) ?? null;
  const breadcrumb: FolderRow[] = [];
  let cursor = currentFolder;
  while (cursor) {
    breadcrumb.unshift(cursor);
    cursor = allFolders.find((f) => f.id === cursor!.parentFolderId) ?? null;
  }

  const needle = query.trim().toLowerCase();
  const subFolders = allFolders
    .filter((f) => f.parentFolderId === folderId)
    .filter((f) => !needle || f.name.toLowerCase().includes(needle));
  const visibleDocuments = documents
    .filter((d) => !needle || d.title.toLowerCase().includes(needle))
    .sort((a, b) =>
      sort === "recent"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
    );
  const childCount = (id: string) => allFolders.filter((f) => f.parentFolderId === id).length;

  async function createFolder(name: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentFolderId: folderId }),
    });
    if (!res.ok) {
      setError("No se pudo crear la carpeta.");
      return;
    }
    setDialog({ kind: "none" });
    refresh();
  }

  async function createDocument(type: DocumentType, title: string) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, folderId, content: "" }),
    });
    if (!res.ok) {
      setError("No se pudo crear el documento.");
      return;
    }
    const created: DocumentRow = await res.json();
    router.push(`/documents/${created.id}`);
  }

  async function importFile(file: File) {
    const lowerName = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setError(`Formato no soportado: ${file.name}. Usa .txt, .musicxml, .xml o .pdf.`);
      return;
    }
    const isPdf = lowerName.endsWith(".pdf");
    const isMusicXml = MUSICXML_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    setImporting(true);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (isPdf) {
        const title = file.name.replace(/\.pdf$/i, "") || "Sin título";
        const blobUrl = await uploadPdf(file);
        body = { type: "pdf", title, folderId, blobUrl };
      } else {
        const type: DocumentType = isMusicXml ? "musicxml" : "text";
        const text = await file.text();
        const workTitle = isMusicXml
          ? text.match(/<work-title>\s*([\s\S]*?)\s*<\/work-title>/)?.[1]
          : null;
        const title =
          workTitle || file.name.replace(/\.(txt|musicxml|xml)$/i, "") || "Sin título";
        body = { type, title, folderId, content: text };
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await readJson<DocumentRow>(res);
      router.push(`/documents/${created.id}`);
    } catch {
      setError(`No se pudo importar ${file.name}.`);
    } finally {
      setImporting(false);
    }
  }

  function handleImportInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void importFile(file);
  }

  async function deleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setDialog({ kind: "none" });
    refresh();
  }

  async function deleteDocument(id: string) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDialog({ kind: "none" });
    refresh();
  }

  // Page-wide drag & drop import. A depth counter avoids flicker as the
  // pointer crosses child elements (each fires its own enter/leave pair).
  function hasFiles(e: React.DragEvent) {
    return Array.from(e.dataTransfer.types).includes("Files");
  }
  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && !importing) void importFile(file);
    },
  };

  type QuickAction = "text" | "chordpro" | "folder" | "import";
  const quickActions: Array<{ id: QuickAction; label: string; hint: string; icon: string }> = [
    { id: "text", label: "Nuevo guion", hint: "Texto para teleprompter", icon: "📜" },
    { id: "chordpro", label: "Nuevo ChordPro", hint: "Letra con [acordes]", icon: "🎸" },
    { id: "folder", label: "Nueva carpeta", hint: "Organiza tu biblioteca", icon: "📁" },
    { id: "import", label: importing ? "Importando…" : "Importar archivo", hint: ".txt · .musicxml · .pdf", icon: "⇪" },
  ];

  function runQuickAction(id: QuickAction) {
    if (id === "folder") setDialog({ kind: "folder" });
    else if (id === "import") fileInputRef.current?.click();
    else setDialog({ kind: "document", type: id });
  }

  const isEmpty = !loading && subFolders.length === 0 && visibleDocuments.length === 0;

  return (
    <div {...dropHandlers} className="relative flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        {/* Heading + breadcrumb */}
        <div className="flex flex-col gap-2">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Biblioteca
            </Link>
            {breadcrumb.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <span className="text-zinc-300 dark:text-zinc-700">/</span>
                <Link href={`/folders/${f.id}`} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  {f.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="text-3xl font-bold tracking-tight">
            {folderId ? (currentFolder?.name ?? (loading ? "…" : "Carpeta")) : "Tu biblioteca"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {folderId
              ? "Guiones, partituras y PDFs de esta carpeta."
              : "Crea, importa y organiza todo lo que vas a leer en escena."}
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((a) => (
            <button
              key={a.id}
              onClick={() => runQuickAction(a.id)}
              disabled={importing}
              className="group flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl transition group-hover:scale-110">
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{a.label}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{a.hint}</span>
              </span>
            </button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleImportInput}
            className="hidden"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en esta carpeta…"
              aria-label="Buscar"
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-zinc-900"
            />
          </div>
          <div className="flex rounded-xl border border-black/10 bg-white p-0.5 text-xs font-medium dark:border-white/10 dark:bg-zinc-900">
            {(["name", "recent"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                aria-pressed={sort === mode}
                className={`rounded-lg px-3 py-1.5 transition ${
                  sort === mode
                    ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-black"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {mode === "name" ? "A–Z" : "Recientes"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/[.05] dark:bg-white/[.05]" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/10 px-6 py-16 text-center dark:border-white/10">
            <div className="text-5xl">{needle ? "🔍" : "🎬"}</div>
            <h2 className="mt-4 text-lg font-semibold">
              {needle ? "Sin resultados" : "Aún no hay nada aquí"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              {needle
                ? `Nada coincide con “${query.trim()}” en esta carpeta.`
                : "Crea tu primer guion o arrastra aquí un archivo .txt, .musicxml o .pdf para empezar."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {subFolders.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Carpetas · {subFolders.length}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {subFolders.map((f) => (
                    <div
                      key={f.id}
                      className="group relative flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 transition hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 dark:border-white/10 dark:bg-zinc-900"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
                        📁
                      </span>
                      <Link
                        href={`/folders/${f.id}`}
                        className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl"
                      >
                        <span className="block truncate text-sm font-medium">{f.name}</span>
                        {childCount(f.id) > 0 && (
                          <span className="block text-xs text-zinc-500">
                            {childCount(f.id)} subcarpeta{childCount(f.id) === 1 ? "" : "s"}
                          </span>
                        )}
                      </Link>
                      <button
                        onClick={() => setDialog({ kind: "delete-folder", folder: f })}
                        className="relative z-10 rounded-md p-1 text-xs text-zinc-400 opacity-100 transition hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                        aria-label={`Eliminar carpeta ${f.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {visibleDocuments.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Documentos · {visibleDocuments.length}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleDocuments.map((doc) => {
                    const style = TYPE_STYLE[doc.type];
                    return (
                      <div
                        key={doc.id}
                        className="group relative flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 dark:border-white/10 dark:bg-zinc-900"
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${style.tint}`}>
                          {style.icon}
                        </span>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl"
                        >
                          <span className="block truncate font-medium">{doc.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                            <span className={`rounded-md px-1.5 py-0.5 font-medium ${style.tint}`}>
                              {TYPE_LABEL[doc.type]}
                            </span>
                            {doc.metadata?.pdf?.url && doc.type !== "pdf" && <span title="PDF adjunto">📎 PDF</span>}
                            <span>{formatUpdated(doc.updatedAt)}</span>
                          </span>
                        </Link>
                        <button
                          onClick={() => setDialog({ kind: "delete-document", document: doc })}
                          className="relative z-10 rounded-md p-1 text-xs text-zinc-400 opacity-100 transition hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          aria-label={`Eliminar ${doc.title}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Drop overlay */}
      {(dragging || importing) && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-emerald-500/10 p-6 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-emerald-500 bg-white/90 px-10 py-8 text-center shadow-xl dark:bg-zinc-900/90">
            <div className="text-4xl">{importing ? "⏳" : "⇪"}</div>
            <p className="mt-2 font-semibold">{importing ? "Importando…" : "Suelta para importar"}</p>
            <p className="text-xs text-zinc-500">.txt · .musicxml · .xml · .pdf</p>
          </div>
        </div>
      )}

      <PromptDialog
        open={dialog.kind === "folder"}
        title="Nueva carpeta"
        label="Nombre"
        placeholder="Ej. Gira 2026"
        onSubmit={createFolder}
        onClose={() => setDialog({ kind: "none" })}
      />
      <PromptDialog
        open={dialog.kind === "document"}
        title={dialog.kind === "document" && dialog.type === "chordpro" ? "Nuevo ChordPro" : "Nuevo guion"}
        description={
          dialog.kind === "document" && dialog.type === "chordpro"
            ? "Letra con acordes entre corchetes, p. ej. [C]Hola [G]mundo."
            : "Texto que se desplazará en el teleprompter."
        }
        label="Título"
        placeholder="Ej. Apertura del concierto"
        onSubmit={(title) => (dialog.kind === "document" ? createDocument(dialog.type, title) : undefined)}
        onClose={() => setDialog({ kind: "none" })}
      />
      <ConfirmDialog
        open={dialog.kind === "delete-folder"}
        title="¿Eliminar carpeta?"
        description={
          dialog.kind === "delete-folder"
            ? `Se eliminará “${dialog.folder.name}” y todas sus subcarpetas. Los documentos que contenga pasarán a la raíz de la biblioteca.`
            : undefined
        }
        onConfirm={() => (dialog.kind === "delete-folder" ? deleteFolder(dialog.folder.id) : undefined)}
        onClose={() => setDialog({ kind: "none" })}
      />
      <ConfirmDialog
        open={dialog.kind === "delete-document"}
        title="¿Eliminar documento?"
        description={
          dialog.kind === "delete-document"
            ? `“${dialog.document.title}” se eliminará de forma permanente.`
            : undefined
        }
        onConfirm={() => (dialog.kind === "delete-document" ? deleteDocument(dialog.document.id) : undefined)}
        onClose={() => setDialog({ kind: "none" })}
      />
    </div>
  );
}
