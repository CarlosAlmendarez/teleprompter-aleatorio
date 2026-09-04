"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { PrompterMode } from "./usePrompterEngine";

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

export function PrompterToolbar({
  visible,
  mode,
  playing,
  mirror,
  title,
  backHref,
  minSpeed,
  maxSpeed,
  speedStep,
  defaultSpeed,
  minFontSize,
  maxFontSize,
  defaultFontSize,
  fontSizeInputRef,
  onModeChange,
  onPlayingToggle,
  onReset,
  onSpeedInput,
  onFontSizeInput,
  onMirrorChange,
  onFullscreen,
  onHide,
  pdfAvailable = false,
  pdfVisible = false,
  onTogglePdf,
}: {
  visible: boolean;
  mode: PrompterMode;
  playing: boolean;
  mirror: boolean;
  title: string;
  backHref: string;
  minSpeed: number;
  maxSpeed: number;
  speedStep: number;
  defaultSpeed: number;
  minFontSize: number;
  maxFontSize: number;
  defaultFontSize: number;
  fontSizeInputRef: RefObject<HTMLInputElement | null>;
  onModeChange: (mode: PrompterMode) => void;
  onPlayingToggle: () => void;
  onReset: () => void;
  onSpeedInput: (value: number) => void;
  onFontSizeInput: (value: number) => void;
  onMirrorChange: (checked: boolean) => void;
  onFullscreen: () => void;
  onHide: () => void;
  pdfAvailable?: boolean;
  pdfVisible?: boolean;
  onTogglePdf?: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b border-black/10 bg-zinc-100 px-3 py-2 text-zinc-900 transition-transform duration-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 ${
        visible ? "" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <Link
        href={backHref}
        title="Cerrar teleprompter"
        aria-label="Cerrar teleprompter"
        className={BUTTON_CLASS}
      >
        ✕
      </Link>

      <span className="mr-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{title}</span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onModeChange("auto")}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            mode === "auto"
              ? "border-emerald-400 bg-emerald-400 font-semibold text-black"
              : "border-black/15 bg-black/5 dark:border-white/15 dark:bg-white/5"
          }`}
        >
          ▶ Auto
        </button>
        <button
          onClick={() => onModeChange("manual")}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            mode === "manual"
              ? "border-emerald-400 bg-emerald-400 font-semibold text-black"
              : "border-black/15 bg-black/5 dark:border-white/15 dark:bg-white/5"
          }`}
        >
          ✋ Manual
        </button>
      </div>

      {mode === "auto" && (
        <button onClick={onPlayingToggle} className={BUTTON_CLASS}>
          {playing ? "⏸ Pausar" : "▶ Reanudar"}
        </button>
      )}

      <button onClick={onReset} className={BUTTON_CLASS}>
        ⟲ Inicio
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Velocidad</label>
        <input
          type="range"
          min={minSpeed}
          max={maxSpeed}
          step={speedStep}
          defaultValue={defaultSpeed}
          onInput={(e) => onSpeedInput(Number(e.currentTarget.value))}
          className="w-24 accent-emerald-500 dark:accent-emerald-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Tamaño</label>
        <input
          ref={fontSizeInputRef}
          type="range"
          min={minFontSize}
          max={maxFontSize}
          defaultValue={defaultFontSize}
          onInput={(e) => onFontSizeInput(Number(e.currentTarget.value))}
          className="w-24 accent-emerald-500 dark:accent-emerald-400"
        />
      </div>

      <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => onMirrorChange(e.target.checked)}
          className="h-4 w-4 accent-emerald-500 dark:accent-emerald-400"
        />
        Espejo
      </label>

      <div className="flex-1" />

      {pdfAvailable && (
        <button onClick={onTogglePdf} className={BUTTON_CLASS} aria-pressed={pdfVisible}>
          {pdfVisible ? "⊟ Ocultar PDF" : "⊞ Ver PDF"}
        </button>
      )}
      <ThemeToggle className={BUTTON_CLASS} />
      <button onClick={onFullscreen} className={BUTTON_CLASS}>
        ⛶
      </button>
      <button onClick={onHide} className={BUTTON_CLASS}>
        ▲ Ocultar
      </button>
    </div>
  );
}
