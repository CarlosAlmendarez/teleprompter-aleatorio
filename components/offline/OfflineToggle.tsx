"use client";

import { useState } from "react";
import { syncOfflineContent } from "@/lib/offline/client";
import type { OfflineTarget } from "@/lib/offline/types";

type Status = "idle" | "working" | "error";

/**
 * "Disponible sin conexión" switch for a document or setlist. The mark is
 * stored server-side (so every signed-in device picks it up); the download
 * onto this device happens right away through the service worker.
 */
export function OfflineToggle({ target, initialMarked }: { target: OfflineTarget; initialMarked: boolean }) {
  const [marked, setMarked] = useState(initialMarked);
  const [status, setStatus] = useState<Status>("idle");

  async function toggle() {
    const next = !marked;
    setStatus("working");
    try {
      const res = await fetch("/api/offline", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) throw new Error();
      setMarked(next);
      const result = await syncOfflineContent();
      setStatus(result && !result.ok ? "error" : "idle");
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "working"
      ? marked
        ? "Quitando…"
        : "Descargando…"
      : marked
        ? "✓ Sin conexión"
        : "⤓ Disponible sin conexión";

  return (
    <button
      onClick={toggle}
      disabled={status === "working"}
      aria-pressed={marked}
      title={
        status === "error"
          ? "Algunos archivos no se pudieron descargar. Vuelve a intentarlo con conexión."
          : marked
            ? "Guardado para usar sin conexión. Pulsa para dejar de guardarlo."
            : "Guarda una copia en este dispositivo para usarla sin internet."
      }
      className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        status === "error"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : marked
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-black/10 hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
      }`}
    >
      {status === "error" ? "⚠ Reintentar descarga" : label}
    </button>
  );
}
