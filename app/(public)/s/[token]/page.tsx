import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { TYPE_LABEL, TYPE_STYLE } from "@/components/library/documentTypes";
import { SETLIST_KIND_LABEL } from "@/lib/setlists/types";
import { getSharedSetlist, shareHref } from "@/lib/shares/queries";
import { formatShift } from "@/lib/music/transpose";

export const metadata: Metadata = { title: "Setlist compartido", robots: { index: false, follow: false } };

export default async function SharedSetlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const setlist = await getSharedSetlist(token);
  if (!setlist) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-black/5 bg-white/80 dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            Solo lectura
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{SETLIST_KIND_LABEL[setlist.kind]}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{setlist.name}</h1>
        </div>
        {setlist.items.length === 0 ? (
          <p className="text-sm text-zinc-500">Este setlist está vacío.</p>
        ) : (
          <>
            <Link
              href={shareHref(token, 0)}
              className="self-start rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
            >
              ▶ Reproducir desde el principio
            </Link>
            <ol className="flex flex-col gap-2">
              {setlist.items.map((item, i) => {
                const style = TYPE_STYLE[item.type];
                const o = item.overrides;
                const notes = [
                  o.transpose ? `Tono ${formatShift(o.transpose)}` : null,
                  o.capo ? `Cejilla ${o.capo}` : null,
                  o.tempoPct && o.tempoPct !== 100 ? `Tempo ${o.tempoPct}%` : null,
                ].filter(Boolean);
                return (
                  <li key={item.id}>
                    <Link
                      href={shareHref(token, i)}
                      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 transition hover:border-emerald-500/40 dark:border-white/10 dark:bg-zinc-900"
                    >
                      <span className="w-6 text-right text-sm font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${style.tint}`}>
                        {style.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block text-xs text-zinc-500">
                          {[TYPE_LABEL[item.type], ...notes].join(" · ")}
                        </span>
                        {o.transitionNote && (
                          <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">📝 {o.transitionNote}</span>
                        )}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">▶</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}
