"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, ConfirmDialog } from "@/components/ui/Dialog";
import { SETLIST_KIND_LABEL, type SetlistKind, type SetlistSummary } from "@/lib/setlists/types";

export function SetlistsBrowser() {
  const router = useRouter();
  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SetlistKind>("music_set");
  const [toDelete, setToDelete] = useState<SetlistSummary | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/setlists");
      if (!res.ok) throw new Error();
      setSetlists(await res.json());
      setError(null);
    } catch {
      setError("No se pudieron cargar los setlists.");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- initial client fetch */
  useEffect(() => void refresh(), []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), kind }),
    });
    if (!res.ok) {
      setError("No se pudo crear el setlist.");
      return;
    }
    const created: { id: string } = await res.json();
    router.push(`/setlists/${created.id}`);
  }

  async function remove(id: string) {
    await fetch(`/api/setlists/${id}`, { method: "DELETE" });
    setToDelete(null);
    refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Setlists</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Ordena canciones y guiones para reproducirlos uno tras otro en escena.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className={BUTTON_PRIMARY}>
            + Nuevo setlist
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={create}
          className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nombre</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Ej. Concierto de otoño"
              className="rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15"
            />
          </label>
          <fieldset className="flex flex-wrap gap-2 text-sm">
            <legend className="mb-1.5 font-medium">Tipo</legend>
            {(Object.keys(SETLIST_KIND_LABEL) as SetlistKind[]).map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${
                  kind === k
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-black/10 dark:border-white/15"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="accent-emerald-500"
                />
                {k === "music_set" ? "🎸" : "📜"} {SETLIST_KIND_LABEL[k]}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className={BUTTON_SECONDARY}>
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim()} className={BUTTON_PRIMARY}>
              Crear
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/[.05] dark:bg-white/[.05]" />
          ))}
        </div>
      ) : setlists.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-black/10 px-6 py-16 text-center dark:border-white/10">
          <div className="text-5xl">🎶</div>
          <h2 className="mt-4 text-lg font-semibold">Aún no tienes setlists</h2>
          <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Crea uno para encadenar tus canciones o guiones y pasar de uno a otro con una tecla.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {setlists.map((s) => (
            <div
              key={s.id}
              className="group relative flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 dark:border-white/10 dark:bg-zinc-900"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
                {s.kind === "music_set" ? "🎸" : "📜"}
              </span>
              <Link href={`/setlists/${s.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {SETLIST_KIND_LABEL[s.kind]} · {s.itemCount} elemento{s.itemCount === 1 ? "" : "s"}
                </span>
              </Link>
              <button
                onClick={() => setToDelete(s)}
                className="relative z-10 rounded-md p-1 text-xs text-zinc-400 transition hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                aria-label={`Eliminar ${s.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar setlist?"
        description={toDelete ? `“${toDelete.name}” se eliminará. Los documentos no se borran.` : undefined}
        onConfirm={() => (toDelete ? remove(toDelete.id) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
