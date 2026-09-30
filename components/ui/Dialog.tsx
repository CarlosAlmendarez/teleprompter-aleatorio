"use client";

import { useEffect, useRef, useState } from "react";

// In-app replacements for window.prompt / window.confirm, built on the native
// <dialog> element (focus trap, Esc to close and backdrop come for free).

export const BUTTON_PRIMARY =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400";
export const BUTTON_SECONDARY =
  "rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]";
const BUTTON_DANGER =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500";

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);
  return ref;
}

const DIALOG_CLASS =
  "m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100";

export function PromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Crear",
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const ref = useModal(open, onClose);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset the field each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className={DIALOG_CLASS}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>
            Cancelar
          </button>
          <button type="submit" disabled={!value.trim() || busy} className={BUTTON_PRIMARY}>
            {busy ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const ref = useModal(open, onClose);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className={DIALOG_CLASS}>
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BUTTON_SECONDARY} autoFocus>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy} className={BUTTON_DANGER}>
            {busy ? "Eliminando…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
