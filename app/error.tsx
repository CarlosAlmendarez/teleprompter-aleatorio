"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-4 py-20 text-center dark:bg-zinc-950">
      <div className="text-6xl">🎚️</div>
      <h1 className="text-2xl font-bold tracking-tight">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Ocurrió un error inesperado. Puedes reintentarlo o volver a la biblioteca.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => retry()}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          Biblioteca
        </Link>
      </div>
    </div>
  );
}
