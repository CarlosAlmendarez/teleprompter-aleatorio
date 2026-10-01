"use client";

import { useEffect, useRef, useState } from "react";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui/Dialog";

type Share = { id: string; token: string; createdAt: string; expiresAt: string | null };

const EXPIRY_OPTIONS: Array<{ value: "" | "1" | "7" | "30"; label: string }> = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "1", label: "24 horas" },
  { value: "", label: "Sin caducidad" },
];

const shareUrl = (token: string) => `${window.location.origin}/s/${token}`;

/** "Compartir" button + dialog to create, copy and revoke read-only links. */
export function ShareDialog({ setlistId }: { setlistId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [expiry, setExpiry] = useState<"" | "1" | "7" | "30">("7");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  async function load() {
    const res = await fetch(`/api/setlists/${setlistId}/shares`);
    if (res.ok) setShares(await res.json());
    else setError("No se pudieron cargar los enlaces.");
  }

  function openDialog() {
    setOpen(true);
    setError(null);
    void load();
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/setlists/${setlistId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInDays: expiry ? Number(expiry) : null }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("No se pudo crear el enlace.");
      return;
    }
    const share: Share = await res.json();
    setShares((list) => [share, ...(list ?? [])]);
    void copy(share.token);
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/setlists/${setlistId}/shares/${id}`, { method: "DELETE" });
    if (res.ok) setShares((list) => (list ?? []).filter((s) => s.id !== id));
    else setError("No se pudo revocar el enlace.");
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      // Clipboard blocked: the link is visible to copy by hand.
    }
  }

  const expired = (s: Share) => s.expiresAt !== null && new Date(s.expiresAt) < new Date();

  return (
    <>
      <button onClick={openDialog} className={BUTTON_SECONDARY}>
        ↗ Compartir
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-4 p-6 text-sm">
          <div>
            <h2 className="text-lg font-semibold">Compartir setlist</h2>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Quien tenga el enlace podrá ver el setlist y reproducir sus documentos, sin iniciar sesión y sin poder
              editar nada. Revoca el enlace cuando ya no lo necesites.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              Caduca en
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value as typeof expiry)}
                className="rounded-lg border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15 dark:bg-zinc-800"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={create} disabled={busy} className={BUTTON_PRIMARY}>
              {busy ? "Creando…" : "Crear enlace"}
            </button>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          {shares === null ? (
            <p className="text-xs text-zinc-500">Cargando…</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-zinc-500">Todavía no hay enlaces.</p>
          ) : (
            <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/5 dark:border-white/10">
              {shares.map((s) => (
                <li key={s.id} className="flex flex-col gap-1.5 px-3 py-2.5">
                  <code className={`truncate text-xs ${expired(s) ? "text-zinc-400 line-through" : ""}`}>
                    {shareUrl(s.token)}
                  </code>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="flex-1">
                      {expired(s)
                        ? "Caducado"
                        : s.expiresAt
                          ? `Caduca el ${new Date(s.expiresAt).toLocaleDateString("es", { day: "numeric", month: "short" })}`
                          : "Sin caducidad"}
                    </span>
                    {!expired(s) && (
                      <button onClick={() => copy(s.token)} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                        {copied === s.token ? "¡Copiado!" : "Copiar"}
                      </button>
                    )}
                    <button onClick={() => revoke(s.id)} className="text-red-600 hover:underline dark:text-red-400">
                      Revocar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <button onClick={() => setOpen(false)} className={BUTTON_SECONDARY}>
              Cerrar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
