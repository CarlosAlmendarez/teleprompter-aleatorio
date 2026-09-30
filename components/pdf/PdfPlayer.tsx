"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SyncedPdfPane } from "@/components/pdf/SyncedPdfPane";
import { SetlistNavBar } from "@/components/setlists/SetlistNavBar";
import { useWakeLock } from "@/components/player/useWakeLock";
import type { SetlistNav } from "@/lib/setlists/types";

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

/** Full-screen PDF reader (standalone, or as a setlist step). */
export function PdfPlayer({
  title,
  url,
  backHref,
  setlistNav = null,
}: {
  title: string;
  url: string;
  backHref: string;
  setlistNav?: SetlistNav | null;
}) {
  const router = useRouter();
  useWakeLock();

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(backHref);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, backHref]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="flex items-center gap-2 border-b border-black/10 bg-zinc-100 px-3 py-2 dark:border-white/10 dark:bg-zinc-900">
        <Link href={backHref} title="Cerrar" aria-label="Cerrar" className={BUTTON_CLASS}>
          ✕
        </Link>
        <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{title}</span>
        <div className="flex-1" />
        <ThemeToggle className={BUTTON_CLASS} />
        <button onClick={toggleFullscreen} className={BUTTON_CLASS} title="Pantalla completa (F)">
          ⛶
        </button>
      </div>
      <SyncedPdfPane url={url} interactive className="min-h-0 flex-1" />
      <SetlistNavBar nav={setlistNav} />
    </div>
  );
}
