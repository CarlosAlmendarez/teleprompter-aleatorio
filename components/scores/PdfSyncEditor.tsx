"use client";

import { useRef, useState } from "react";
import type { DocumentMetadata } from "@/lib/db/schema";
import { parseAnchorText, serializeAnchors } from "@/lib/pdf/anchors";
import { uploadPdf } from "@/lib/pdf/upload-client";

const SAVE_DELAY_MS = 500;

/**
 * Attaches a PDF to a document (any type) and, for musicxml, lets the user pin
 * `page:measure` alignment points. The split-screen immersive player reads
 * `metadata.pdf` and scrolls the PDF in step with playback.
 */
export function PdfSyncEditor({
  documentId,
  metadata,
  measureNumbers,
  withAnchors = false,
}: {
  documentId: string;
  metadata: DocumentMetadata | null;
  measureNumbers?: string[];
  withAnchors?: boolean;
}) {
  const [pdfUrl, setPdfUrl] = useState(metadata?.pdf?.url ?? null);
  const [anchorText, setAnchorText] = useState(
    serializeAnchors(metadata?.pdf?.anchors ?? []),
  );
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "saved" | "error">(
    "idle",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sends the whole `metadata` object (the API replaces the jsonb column). Base
  // fields are spread from the server snapshot, same as LyricsEditor.
  async function patchPdf(pdf: DocumentMetadata["pdf"] | null) {
    setStatus("saving");
    const nextMetadata: DocumentMetadata = { ...metadata };
    if (pdf) nextMetadata.pdf = pdf;
    else delete nextMetadata.pdf;
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: nextMetadata }),
      keepalive: true,
    });
    setStatus(res.ok ? "saved" : "error");
  }

  async function handleFile(file: File) {
    setStatus("uploading");
    try {
      const url = await uploadPdf(file);
      const pdf = {
        url,
        ...(metadata?.pdf?.pageCount ? { pageCount: metadata.pdf.pageCount } : {}),
        ...(withAnchors && anchorText.trim()
          ? { anchors: parseAnchorText(anchorText) }
          : {}),
      };
      setPdfUrl(url);
      await patchPdf(pdf);
    } catch {
      setStatus("error");
    }
  }

  function removePdf() {
    setPdfUrl(null);
    setAnchorText("");
    void patchPdf(null);
  }

  function handleAnchorChange(value: string) {
    setAnchorText(value);
    if (!pdfUrl) return;
    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void patchPdf({
        url: pdfUrl,
        ...(metadata?.pdf?.pageCount ? { pageCount: metadata.pdf.pageCount } : {}),
        anchors: parseAnchorText(value),
      });
    }, SAVE_DELAY_MS);
  }

  const statusLabel =
    status === "uploading"
      ? "Subiendo PDF…"
      : status === "saving"
        ? "Guardando…"
        : status === "saved"
          ? "Guardado"
          : status === "error"
            ? "Error al guardar"
            : "";

  return (
    <div className="flex flex-col gap-2 border-t border-black/10 p-4 dark:border-white/10 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          PDF sincronizado
        </h2>
        <span className="text-xs text-zinc-400">{statusLabel}</span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Adjunta una partitura o guion en PDF para verlo en pantalla dividida
        durante la reproducción; se desplaza al mismo ritmo que el reproductor.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "uploading"}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[.05]"
        >
          {pdfUrl ? "Reemplazar PDF" : "⇪ Subir PDF"}
        </button>
        {pdfUrl && (
          <>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 underline dark:text-emerald-400"
            >
              Abrir PDF
            </a>
            <button
              onClick={removePdf}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 dark:border-white/15"
            >
              Quitar
            </button>
          </>
        )}
      </div>

      {pdfUrl && withAnchors && (
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Opcional: marca dónde empieza cada página con una línea{" "}
            <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">
              página:compás
            </code>{" "}
            (ej. <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">2:17</code>).
            Sin marcas, el PDF avanza proporcional al tiempo. Compases:{" "}
            {measureNumbers && measureNumbers.length > 0
              ? measureNumbers.join(", ")
              : "ninguno"}
            .
          </p>
          <textarea
            value={anchorText}
            onChange={(e) => handleAnchorChange(e.target.value)}
            placeholder={"1:1\n2:17\n3:33"}
            className="min-h-24 resize-y rounded-xl border border-black/10 bg-black/[.02] p-3 font-mono text-sm leading-relaxed outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/[.03]"
          />
        </div>
      )}
    </div>
  );
}
