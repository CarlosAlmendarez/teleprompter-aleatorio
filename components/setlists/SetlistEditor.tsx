"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentRow } from "@/lib/types";
import { BUTTON_PRIMARY, ConfirmDialog } from "@/components/ui/Dialog";
import { TYPE_LABEL, TYPE_STYLE } from "@/components/library/documentTypes";
import { SETLIST_KIND_LABEL, playerHref, type SetlistDetail } from "@/lib/setlists/types";

type Item = Pick<SetlistDetail["items"][number], "documentId" | "title" | "type"> & {
  /** Client-only key so duplicates of one document reorder independently. */
  key: string;
};

const RENAME_DELAY_MS = 500;

let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

export function SetlistEditor({ setlist }: { setlist: SetlistDetail }) {
  const router = useRouter();
  const [name, setName] = useState(setlist.name);
  const [items, setItems] = useState<Item[]>(() =>
    setlist.items.map((it) => ({ documentId: it.documentId, title: it.title, type: it.type, key: nextKey() })),
  );
  const [library, setLibrary] = useState<DocumentRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);

  // Persists the full ordered list. Rapid edits race, so only the latest
  // request's outcome is allowed to update the status label.
  async function saveItems(next: Item[]) {
    setItems(next);
    setStatus("saving");
    const seq = ++saveSeq.current;
    try {
      const res = await fetch(`/api/setlists/${setlist.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: next.map((it) => it.documentId) }),
      });
      if (seq === saveSeq.current) setStatus(res.ok ? "saved" : "error");
    } catch {
      if (seq === saveSeq.current) setStatus("error");
    }
  }

  function rename(value: string) {
    setName(value);
    if (renameTimer.current) clearTimeout(renameTimer.current);
    if (!value.trim()) return;
    setStatus("saving");
    renameTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/setlists/${setlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      setStatus(res.ok ? "saved" : "error");
    }, RENAME_DELAY_MS);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void saveItems(next);
  }

  function add(doc: DocumentRow) {
    void saveItems([...items, { documentId: doc.id, title: doc.title, type: doc.type, key: nextKey() }]);
  }

  async function deleteSetlist() {
    await fetch(`/api/setlists/${setlist.id}`, { method: "DELETE" });
    router.push("/setlists");
  }

  const needle = query.trim().toLowerCase();
  const candidates = (library ?? []).filter((d) => !needle || d.title.toLowerCase().includes(needle));
  const statusLabel =
    status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? "Error al guardar" : "";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/setlists" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Setlists
        </Link>
        <span className="mx-1 text-zinc-300 dark:text-zinc-700">/</span>
        <span>{name || "Sin nombre"}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => rename(e.target.value)}
          aria-label="Nombre del setlist"
          maxLength={200}
          className="min-w-48 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-3xl font-bold tracking-tight outline-none hover:border-black/10 focus:border-emerald-500 dark:hover:border-white/10"
        />
        <span className={`text-xs ${status === "error" ? "text-red-500" : "text-zinc-400"}`}>{statusLabel}</span>
        {items.length > 0 ? (
          <Link href={playerHref({ id: items[0].documentId, type: items[0].type }, { id: setlist.id, index: 0 })} className={BUTTON_PRIMARY}>
            ▶ Reproducir setlist
          </Link>
        ) : null}
        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 dark:border-white/15"
        >
          Eliminar
        </button>
      </div>
      <p className="-mt-3 px-2 text-sm text-zinc-500 dark:text-zinc-400">
        {SETLIST_KIND_LABEL[setlist.kind]} · durante la reproducción usa{" "}
        <kbd className="rounded border border-black/15 px-1 text-xs dark:border-white/20">N</kbd> /{" "}
        <kbd className="rounded border border-black/15 px-1 text-xs dark:border-white/20">P</kbd> para pasar al
        siguiente o anterior.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Ordered items */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Orden · {items.length}
          </h2>
          {items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-black/10 px-6 py-12 text-center text-sm text-zinc-500 dark:border-white/10">
              Añade documentos desde la lista de la derecha.
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {items.map((it, i) => {
                const style = TYPE_STYLE[it.type];
                return (
                  <li
                    key={it.key}
                    draggable
                    onDragStart={(e) => {
                      setDragKey(it.key);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (dragKey) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = items.findIndex((x) => x.key === dragKey);
                      if (from >= 0) move(from, i);
                      setDragKey(null);
                    }}
                    onDragEnd={() => setDragKey(null)}
                    className={`group flex items-center gap-3 rounded-2xl border bg-white p-3 transition dark:bg-zinc-900 ${
                      dragKey === it.key
                        ? "border-emerald-500 opacity-60"
                        : "border-black/10 dark:border-white/10"
                    }`}
                  >
                    <span className="cursor-grab select-none text-zinc-400" aria-hidden="true">
                      ⠿
                    </span>
                    <span className="w-6 text-right text-sm font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${style.tint}`}>
                      {style.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/documents/${it.documentId}`} className="block truncate text-sm font-medium hover:underline">
                        {it.title}
                      </Link>
                      <span className="text-xs text-zinc-500">{TYPE_LABEL[it.type]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0}
                        aria-label="Subir"
                        className="rounded-md px-2 py-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(i, i + 1)}
                        disabled={i === items.length - 1}
                        aria-label="Bajar"
                        className="rounded-md px-2 py-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        ↓
                      </button>
                      <Link
                        href={playerHref({ id: it.documentId, type: it.type }, { id: setlist.id, index: i })}
                        aria-label={`Reproducir desde ${it.title}`}
                        className="rounded-md px-2 py-1 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      >
                        ▶
                      </Link>
                      <button
                        onClick={() => void saveItems(items.filter((x) => x.key !== it.key))}
                        aria-label={`Quitar ${it.title}`}
                        className="rounded-md px-2 py-1 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Library picker */}
        <section className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Añadir de la biblioteca</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documentos…"
            aria-label="Buscar documentos"
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-zinc-900"
          />
          <div className="max-h-[28rem] overflow-y-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
            {library === null ? (
              <p className="p-4 text-sm text-zinc-500">Cargando…</p>
            ) : candidates.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                {library.length === 0 ? "Tu biblioteca está vacía." : "Sin resultados."}
              </p>
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {candidates.map((doc) => {
                  const count = items.filter((it) => it.documentId === doc.id).length;
                  return (
                    <li key={doc.id}>
                      <button
                        onClick={() => add(doc)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-emerald-500/5"
                      >
                        <span className="text-lg">{TYPE_STYLE[doc.type].icon}</span>
                        <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                        {count > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-400">×{count}</span>}
                        <span className="text-emerald-600 dark:text-emerald-400">＋</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar setlist?"
        description={`“${name}” se eliminará. Los documentos no se borran.`}
        onConfirm={deleteSetlist}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
