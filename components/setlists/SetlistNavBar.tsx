"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SetlistNav } from "@/lib/setlists/types";

/**
 * Floating prev/next control shown by the immersive players while playing a
 * setlist. N / PageDown advances, P / PageUp goes back.
 */
export function SetlistNavBar({ nav }: { nav: SetlistNav | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!nav) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "n" || e.key === "N" || e.code === "PageDown") && nav!.next) {
        e.preventDefault();
        router.push(nav!.next.href);
      } else if ((e.key === "p" || e.key === "P" || e.code === "PageUp") && nav!.prev) {
        e.preventDefault();
        router.push(nav!.prev.href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nav, router]);

  if (!nav) return null;

  return (
    <div className="fixed bottom-3 right-3 z-20 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 text-sm shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
      {nav.prev ? (
        <Link
          href={nav.prev.href}
          title={`Anterior: ${nav.prev.title} (P)`}
          className="rounded-full px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          ←
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-zinc-300 dark:text-zinc-700">←</span>
      )}
      <Link
        href={nav.backHref}
        title={`Volver a ${nav.name}`}
        className="whitespace-nowrap px-1 text-xs tabular-nums text-zinc-500 hover:underline dark:text-zinc-400"
      >
        {nav.index + 1} / {nav.total}
      </Link>
      {nav.next ? (
        <Link
          href={nav.next.href}
          title={`Siguiente (N)`}
          className="flex min-w-0 items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 font-medium text-black hover:bg-emerald-400"
        >
          <span className="truncate">{nav.next.title}</span>
          <span>→</span>
        </Link>
      ) : (
        <Link
          href={nav.backHref}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Fin ✓
        </Link>
      )}
    </div>
  );
}
