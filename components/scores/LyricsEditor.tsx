"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentMetadata } from "@/lib/db/schema";
import { findLyricIssues } from "@/lib/musicxml/parseLyricChart";

const SAVE_DELAY_MS = 500;

export function LyricsEditor({
  documentId,
  metadata,
  measureNumbers,
}: {
  documentId: string;
  metadata: DocumentMetadata | null;
  measureNumbers: string[];
}) {
  const [lyrics, setLyrics] = useState(metadata?.lyrics ?? "");
  const [status, setStatus] = useState<"saved" | "pending" | "saving">("saved");

  const latestRef = useRef(lyrics);
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
    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { lyrics: latestRef.current } }),
      keepalive: true,
    });
    setStatus("saved");
  }

  function handleChange(value: string) {
    setLyrics(value);
    latestRef.current = value;
    dirtyRef.current = true;
    setStatus("pending");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { lyrics: latestRef.current } }),
          keepalive: true,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issues = findLyricIssues(lyrics, measureNumbers);
  const warnings: string[] = [];
  if (issues.unknownMeasures.length > 0) {
    const tags = issues.unknownMeasures.map((n) => `{m:${n}}`).join(", ");
    warnings.push(
      issues.unknownMeasures.length === 1
        ? `La etiqueta ${tags} no corresponde a ningún compás: su texto no se mostrará.`
        : `Las etiquetas ${tags} no corresponden a ningún compás: su texto no se mostrará.`,
    );
  }
  if (issues.untaggedLeadingLines > 0) {
    warnings.push(
      issues.untaggedLeadingLines === 1
        ? "1 línea está antes de la primera etiqueta {m:N} válida y no se mostrará."
        : `${issues.untaggedLeadingLines} líneas están antes de la primera etiqueta {m:N} válida y no se mostrarán.`,
    );
  }

  const statusLabel = status === "saving" ? "Guardando…" : status === "pending" ? "Sin guardar…" : "Guardado";

  return (
    <div className="flex flex-1 flex-col gap-2 border-t border-black/10 p-4 dark:border-white/10 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Letra sincronizada
        </h2>
        <span className="text-xs text-zinc-400">{statusLabel}</span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pega la letra y marca dónde empieza cada compás con{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">{"{m:NÚMERO}"}</code>{" "}
        en su propia línea, justo antes del texto. Compases disponibles:{" "}
        {measureNumbers.length > 0 ? measureNumbers.join(", ") : "ninguno"}.
      </p>
      <textarea
        value={lyrics}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`{m:1}\nHey Ming, I thought there were gonna be chicks at this party\n{m:57}\nI never thought that I'd catch this love bug again`}
        className="min-h-[30vh] flex-1 resize-none rounded-xl border border-black/10 bg-black/[.02] p-4 font-mono text-sm leading-relaxed outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/[.03]"
      />
      {warnings.length > 0 && (
        <ul
          role="status"
          className="flex flex-col gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
