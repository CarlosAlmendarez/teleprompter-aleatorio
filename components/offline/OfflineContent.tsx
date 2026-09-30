"use client";

import { useEffect, useState } from "react";
import { listOfflineContent, type StoredManifest } from "@/lib/offline/client";

/** Lists the pages this device saved for offline use (read from the SW). */
export function OfflineContent() {
  const [manifest, setManifest] = useState<StoredManifest | null | undefined>(undefined);

  useEffect(() => {
    listOfflineContent()
      .then(setManifest)
      .catch(() => setManifest(null));
  }, []);

  if (manifest === undefined) {
    return <p className="mt-8 text-sm text-zinc-500">Buscando copias guardadas…</p>;
  }
  if (!manifest || manifest.pages.length === 0) {
    return (
      <p className="mt-8 max-w-md text-center text-sm text-zinc-500">
        No hay nada guardado todavía. Con conexión, abre un documento o setlist y pulsa
        “Disponible sin conexión”.
      </p>
    );
  }
  return (
    <div className="mt-8 w-full max-w-lg">
      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-zinc-900">
        {manifest.pages.map((page) => (
          <li key={page.url}>
            {/* Plain <a>: a full navigation lets the service worker answer from cache. */}
            <a href={page.url} className="block px-4 py-3 text-sm hover:bg-emerald-500/5">
              {page.title}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-6 text-center">
        <button
          onClick={() => location.reload()}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
        >
          Reintentar conexión
        </button>
      </div>
      {manifest.syncedAt && (
        <p className="mt-3 text-center text-xs text-zinc-500">
          Última descarga: {new Date(manifest.syncedAt).toLocaleString("es")}
        </p>
      )}
    </div>
  );
}
