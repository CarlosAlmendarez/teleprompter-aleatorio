"use client";

import type { RefObject } from "react";
import type { PrompterMode } from "./usePrompterEngine";

export function PrompterToolbar({
  visible,
  mode,
  playing,
  mirror,
  title,
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
}: {
  visible: boolean;
  mode: PrompterMode;
  playing: boolean;
  mirror: boolean;
  title: string;
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
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100 transition-transform duration-200 ${
        visible ? "" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <span className="mr-1 truncate text-sm text-zinc-400">{title}</span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onModeChange("auto")}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            mode === "auto"
              ? "border-emerald-400 bg-emerald-400 font-semibold text-black"
              : "border-white/15 bg-white/5"
          }`}
        >
          ▶ Auto
        </button>
        <button
          onClick={() => onModeChange("manual")}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            mode === "manual"
              ? "border-emerald-400 bg-emerald-400 font-semibold text-black"
              : "border-white/15 bg-white/5"
          }`}
        >
          ✋ Manual
        </button>
      </div>

      {mode === "auto" && (
        <button
          onClick={onPlayingToggle}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm"
        >
          {playing ? "⏸ Pausar" : "▶ Reanudar"}
        </button>
      )}

      <button
        onClick={onReset}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm"
      >
        ⟲ Inicio
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400">Velocidad</label>
        <input
          type="range"
          min={minSpeed}
          max={maxSpeed}
          step={speedStep}
          defaultValue={defaultSpeed}
          onInput={(e) => onSpeedInput(Number(e.currentTarget.value))}
          className="w-24 accent-emerald-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400">Tamaño</label>
        <input
          ref={fontSizeInputRef}
          type="range"
          min={minFontSize}
          max={maxFontSize}
          defaultValue={defaultFontSize}
          onInput={(e) => onFontSizeInput(Number(e.currentTarget.value))}
          className="w-24 accent-emerald-400"
        />
      </div>

      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => onMirrorChange(e.target.checked)}
          className="h-4 w-4 accent-emerald-400"
        />
        Espejo
      </label>

      <div className="flex-1" />

      <button
        onClick={onFullscreen}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm"
      >
        ⛶
      </button>
      <button
        onClick={onHide}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm"
      >
        ▲ Ocultar
      </button>
    </div>
  );
}
