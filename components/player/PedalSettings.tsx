"use client";

import { useEffect, useRef, useState } from "react";
import {
  PEDAL_ACTIONS,
  PEDAL_ACTION_LABEL,
  PEDAL_PRESETS,
  bindKey,
  keyLabel,
  savePedalConfig,
  type PedalAction,
} from "@/lib/player/pedal";
import { usePedalConfig } from "./usePedal";

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

/**
 * Toolbar button + dialog to set up a Bluetooth pedal: turn the mode on, pick
 * a preset, or press the pedal to assign each action.
 */
export function PedalSettings({ actions = PEDAL_ACTIONS }: { actions?: PedalAction[] }) {
  const config = usePedalConfig();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [learning, setLearning] = useState<PedalAction | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // While learning, the next key pressed becomes that action's binding.
  useEffect(() => {
    if (!learning) return;
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        setLearning(null);
        return;
      }
      savePedalConfig({ ...config, bindings: bindKey(config.bindings, learning!, e.code || e.key) });
      setLearning(null);
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [learning, config]);

  function unbind(action: PedalAction) {
    const bindings = { ...config.bindings };
    delete bindings[action];
    savePedalConfig({ ...config, bindings });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-pressed={config.enabled}
        title="Configurar pedal Bluetooth"
        className={`${BUTTON_CLASS} ${config.enabled ? "!border-emerald-500 !bg-emerald-500/15" : ""}`}
      >
        🦶 Pedal{config.enabled ? " ✓" : ""}
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => {
          setOpen(false);
          setLearning(null);
        }}
        onClick={(e) => e.stopPropagation()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-4 p-6 text-sm">
          <div>
            <h2 className="text-lg font-semibold">Pedal Bluetooth</h2>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Los pedales de pasar página funcionan como un teclado. Actívalo y asigna qué hace cada pedal.
              Se guarda en este dispositivo.
            </p>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2.5 dark:border-white/10">
            <span className="font-medium">Modo pedal</span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => savePedalConfig({ ...config, enabled: e.target.checked })}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Preajustes:</span>
            {PEDAL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => savePedalConfig({ enabled: true, bindings: preset.bindings })}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/5 dark:border-white/10">
            {actions.map((action) => (
              <li key={action} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1">{PEDAL_ACTION_LABEL[action]}</span>
                <kbd className="min-w-14 rounded-md border border-black/15 px-2 py-0.5 text-center text-xs dark:border-white/20">
                  {learning === action ? "…" : keyLabel(config.bindings[action])}
                </kbd>
                <button
                  onClick={() => setLearning(learning === action ? null : action)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${
                    learning === action
                      ? "bg-emerald-500 text-black"
                      : "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                  }`}
                >
                  {learning === action ? "Pulsa el pedal…" : "Asignar"}
                </button>
                {config.bindings[action] && (
                  <button
                    onClick={() => unbind(action)}
                    aria-label={`Quitar tecla de ${PEDAL_ACTION_LABEL[action]}`}
                    className="rounded-md px-1.5 py-1 text-xs text-zinc-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400"
            >
              Listo
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
