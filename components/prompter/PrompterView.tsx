"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrompterEngine } from "./usePrompterEngine";
import { PrompterToolbar } from "./PrompterToolbar";

const MIN_FONT = 18;
const MAX_FONT = 90;
const DEFAULT_FONT = 40;
const ARROW_NUDGE_PX = 80;

export function PrompterView({
  title,
  content,
  backHref,
}: {
  title: string;
  content: string;
  backHref: string;
}) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fontSizeInputRef = useRef<HTMLInputElement>(null);

  const {
    mode,
    playing,
    mirror,
    setMirror,
    setMode,
    setPlaying,
    reset,
    nudge,
    changeSpeed,
    setSpeed,
    minSpeed,
    maxSpeed,
    speedStep,
  } = usePrompterEngine(viewportRef);

  const [barVisible, setBarVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setHintVisible(false), 6000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.code === "ArrowDown") {
        nudge(ARROW_NUDGE_PX);
      } else if (e.code === "ArrowUp") {
        nudge(-ARROW_NUDGE_PX);
      } else if (e.code === "ArrowRight") {
        changeSpeed(speedStep);
      } else if (e.code === "ArrowLeft") {
        changeSpeed(-speedStep);
      } else if (e.key === "m" || e.key === "M") {
        setMode(mode === "auto" ? "manual" : "auto");
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        router.push(backHref);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playing, mode, setPlaying, setMode, nudge, changeSpeed, speedStep, router, backHref]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function handleFontSizeInput(value: number) {
    if (textLayerRef.current) {
      textLayerRef.current.style.fontSize = `${value}px`;
    }
  }

  useEffect(() => {
    if (textLayerRef.current) {
      textLayerRef.current.style.fontSize = `${DEFAULT_FONT}px`;
    }
  }, []);

  const hasContent = content.trim().length > 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-zinc-900 select-none dark:bg-black dark:text-zinc-100">
      <PrompterToolbar
        visible={barVisible}
        mode={mode}
        playing={playing}
        mirror={mirror}
        title={title}
        backHref={backHref}
        minSpeed={minSpeed}
        maxSpeed={maxSpeed}
        speedStep={speedStep}
        defaultSpeed={40}
        minFontSize={MIN_FONT}
        maxFontSize={MAX_FONT}
        defaultFontSize={DEFAULT_FONT}
        fontSizeInputRef={fontSizeInputRef}
        onModeChange={setMode}
        onPlayingToggle={() => setPlaying(!playing)}
        onReset={reset}
        onSpeedInput={setSpeed}
        onFontSizeInput={handleFontSizeInput}
        onMirrorChange={setMirror}
        onFullscreen={toggleFullscreen}
        onHide={() => setBarVisible(false)}
      />

      <div
        ref={viewportRef}
        onClick={() => setBarVisible((v) => !v)}
        className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-[40%] h-px bg-emerald-500/35 dark:bg-emerald-400/35" />
        {hasContent ? (
          <div
            ref={textLayerRef}
            className={`whitespace-pre-wrap break-words px-[6vw] pt-[45vh] pb-[60vh] leading-relaxed transition-[font-size] duration-150 ${
              mirror ? "[transform:scaleX(-1)]" : ""
            }`}
          >
            {content}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">Este guion todavía está vacío.</p>
            <Link
              href={backHref}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Editar guion
            </Link>
          </div>
        )}
      </div>

      <div
        className={`pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/10 px-3 py-1 text-xs text-zinc-500 transition-opacity duration-1000 dark:bg-black/40 dark:text-zinc-400 ${
          hintVisible ? "opacity-80" : "opacity-0"
        }`}
      >
        Toca la pantalla para mostrar/ocultar controles · Espacio = play/pausa
      </div>
    </div>
  );
}
