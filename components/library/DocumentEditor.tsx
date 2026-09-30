"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentRow } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/Dialog";

const SAVE_DELAY_MS = 500;

type SaveStatus = "saved" | "pending" | "saving";

export function DocumentEditor({
  document: doc,
  headerExtra,
}: {
  document: DocumentRow;
  headerExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content ?? "");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ref mirrors the latest field values (updated synchronously in the
  // onChange handlers below, not via an effect) so the debounce timeout, the
  // flush called from the back button, and the unmount cleanup all send the
  // same up-to-date payload instead of a stale closure.
  const latestRef = useRef({ title, content });
  const dirtyRef = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus("saving");
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(latestRef.current),
      keepalive: true,
    });
    setStatus("saved");
    setSavedAt(new Date());
  }

  function markDirty(next: Partial<{ title: string; content: string }>) {
    latestRef.current = { ...latestRef.current, ...next };
    dirtyRef.current = true;
    setStatus("pending");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      // Best-effort flush on unmount so navigating away right after typing
      // doesn't drop the last edit still sitting in the debounce timer.
      if (dirtyRef.current) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(latestRef.current),
          keepalive: true,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backHref = doc.folderId ? `/folders/${doc.folderId}` : "/dashboard";

  async function handleBack() {
    await flush();
    router.push(backHref);
  }

  async function handleDelete() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    dirtyRef.current = false;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    router.push(backHref);
  }

  const statusLabel =
    status === "saving" ? "Guardando…" : status === "pending" ? "Cambios sin guardar…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : "";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleBack}
          title="Volver"
          className="whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          ← Volver
        </button>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty({ title: e.target.value });
          }}
          aria-label="Título"
          className="min-w-40 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-bold tracking-tight outline-none hover:border-black/10 focus:border-black/20 dark:hover:border-white/10 dark:focus:border-white/20"
        />
        <span className="whitespace-nowrap text-xs text-zinc-400">{statusLabel}</span>
        {headerExtra}
        <Link
          href={`/prompter/${doc.id}`}
          onClick={() => flush()}
          className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          ▶ Teleprompter
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          className="whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 dark:border-white/15"
        >
          Eliminar
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          markDirty({ content: e.target.value });
        }}
        placeholder={
          doc.type === "chordpro"
            ? "Letra con acordes, formato ChordPro: [C]línea de la canción[G]..."
            : "Escribe o pega tu guion/letra aquí..."
        }
        className="min-h-[50vh] flex-1 resize-none rounded-2xl border border-black/10 bg-white p-5 font-mono text-sm leading-relaxed shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-zinc-900"
      />
      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar documento?"
        description={`“${title}” se eliminará de forma permanente.`}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
