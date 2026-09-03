"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentRow } from "@/lib/types";

const SAVE_DELAY_MS = 500;

export function DocumentEditor({ document: doc }: { document: DocumentRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(next: { title?: string; content?: string }) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setSavedAt(new Date());
    }, SAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  async function handleDelete() {
    if (!window.confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    router.push(doc.folderId ? `/folders/${doc.folderId}` : "/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold outline-none hover:border-black/10 focus:border-black/20 dark:hover:border-white/10 dark:focus:border-white/20"
        />
        <span className="whitespace-nowrap text-xs text-zinc-400">
          {savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : ""}
        </span>
        <Link
          href={`/prompter/${doc.id}`}
          className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          ▶ Teleprompter
        </Link>
        <button
          onClick={handleDelete}
          className="whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 dark:border-white/15"
        >
          Eliminar
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          scheduleSave({ content: e.target.value });
        }}
        placeholder={
          doc.type === "chordpro"
            ? "Letra con acordes, formato ChordPro: [C]línea de la canción[G]..."
            : "Escribe o pega tu guion/letra aquí..."
        }
        className="min-h-[50vh] flex-1 resize-none rounded-xl border border-black/10 bg-black/[.02] p-4 font-mono text-sm leading-relaxed outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/[.03]"
      />
    </div>
  );
}
