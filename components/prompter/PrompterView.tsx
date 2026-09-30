"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrompterEngine } from "./usePrompterEngine";
import { PrompterToolbar } from "./PrompterToolbar";
import { ChordProText } from "./ChordProText";
import { SyncedPdfPane, type PdfPaneHandle } from "@/components/pdf/SyncedPdfPane";
import { SetlistNavBar } from "@/components/setlists/SetlistNavBar";
import { useWakeLock } from "@/components/player/useWakeLock";
import { usePlayerSettings } from "@/components/player/usePlayerSettings";
import { TransposeControl } from "@/components/player/TransposeControl";
import { usePedal } from "@/components/player/usePedal";
import { PedalSettings } from "@/components/player/PedalSettings";
import { CountInOverlay, CountInToggle, useCountIn, useCountInPref } from "@/components/player/useCountIn";
import type { SetlistNav } from "@/lib/setlists/types";
import type { DocumentMetadata } from "@/lib/db/schema";
import { resolvePlayerSettings } from "@/lib/player/settings";
import { firstChord, parseChordPro } from "@/lib/chordpro/parse";
import { accidentalsForShift, prettyAccidentals, transposeChord } from "@/lib/music/transpose";

const MIN_FONT = 18;
const MAX_FONT = 90;
const DEFAULT_FONT = 40;
const DEFAULT_SPEED = 40;
const ARROW_NUDGE_PX = 80;

export function PrompterView({
  documentId,
  format = "text",
  title,
  content,
  backHref,
  pdfUrl,
  metadata = null,
  setlistNav = null,
}: {
  documentId: string;
  format?: "text" | "chordpro";
  title: string;
  content: string;
  backHref: string;
  pdfUrl?: string | null;
  metadata?: DocumentMetadata | null;
  setlistNav?: SetlistNav | null;
}) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fontSizeInputRef = useRef<HTMLInputElement>(null);
  const speedInputRef = useRef<HTMLInputElement>(null);
  const pdfPaneRef = useRef<PdfPaneHandle>(null);
  const [showPdf, setShowPdf] = useState(Boolean(pdfUrl));

  // Settings resolved once on mount: document's own, then the setlist step's.
  const [initial] = useState(() => resolvePlayerSettings(metadata, setlistNav?.overrides));
  const initialFont = Math.min(MAX_FONT, Math.max(MIN_FONT, initial.fontSize ?? DEFAULT_FONT));
  const initialSpeed = initial.speed ?? DEFAULT_SPEED;
  const { save } = usePlayerSettings({ documentId, playback: metadata?.playback, setlistNav });

  const song = useMemo(() => (format === "chordpro" ? parseChordPro(content) : null), [format, content]);
  const [transpose, setTranspose] = useState(initial.transpose ?? 0);
  const [capo, setCapo] = useState(initial.capo ?? song?.capo ?? 0);

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
    speedRef,
  } = usePrompterEngine(viewportRef, {
    initialSpeed,
    initialMirror: initial.mirror ?? false,
  });

  useWakeLock();
  const countIn = useCountIn();
  const [countInEnabled] = useCountInPref();

  // Play/pause, with an optional 3-2-1 before auto-scroll starts. Pressing
  // play again during the count cancels it.
  function togglePlay() {
    if (countIn.isCounting()) return countIn.cancel();
    if (!playing && mode === "auto" && countInEnabled) countIn.start(3, 1000, () => setPlaying(true));
    else setPlaying(!playing);
  }
  const togglePlayRef = useRef(togglePlay);
  useEffect(() => {
    togglePlayRef.current = togglePlay;
  });

  usePedal({
    forward: () => scrollByScreen(1),
    back: () => scrollByScreen(-1),
    toggle: togglePlay,
    next: setlistNav?.next ? () => router.push(setlistNav.next!.href) : undefined,
    prev: setlistNav?.prev ? () => router.push(setlistNav.prev!.href) : undefined,
  });
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
        togglePlayRef.current();
      } else if (e.code === "ArrowDown") {
        nudge(ARROW_NUDGE_PX);
      } else if (e.code === "ArrowUp") {
        nudge(-ARROW_NUDGE_PX);
      } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        changeSpeed(e.code === "ArrowRight" ? speedStep : -speedStep);
        // Keep the (uncontrolled) slider in step with keyboard changes.
        if (speedInputRef.current) speedInputRef.current.value = String(speedRef.current);
        save({ speed: speedRef.current });
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
  }, [mode, setMode, nudge, changeSpeed, speedStep, speedRef, router, backHref, save]);

  // A pedal press moves most of a screen, keeping some context in view.
  function scrollByScreen(direction: 1 | -1) {
    const el = viewportRef.current;
    el?.scrollBy({ top: direction * el.clientHeight * 0.6, behavior: "smooth" });
  }

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
    save({ fontSize: value });
  }

  function handleSpeedInput(value: number) {
    setSpeed(value);
    save({ speed: value });
  }

  function handleMirrorChange(next: boolean) {
    setMirror(next);
    save({ mirror: next });
  }

  function handleTransposeChange(next: { transpose: number; capo: number }) {
    setTranspose(next.transpose);
    setCapo(next.capo);
    save(next);
  }

  // Apply the remembered font size, then (outside a setlist) jump back to
  // where the reader left off once the text has laid out.
  useEffect(() => {
    if (textLayerRef.current) textLayerRef.current.style.fontSize = `${initialFont}px`;
    const position = initial.position;
    if (!position) return;
    const frame = requestAnimationFrame(() => {
      const el = viewportRef.current;
      if (el) el.scrollTop = position * Math.max(el.scrollHeight - el.clientHeight, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, initialFont]);

  function handleViewportScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const fraction = max > 0 ? el.scrollTop / max : 0;
    pdfPaneRef.current?.seekFraction(fraction);
    save({ position: Math.round(fraction * 1000) / 1000 });
  }

  const shift = transpose - capo;
  const accidentals = useMemo(
    () => accidentalsForShift(song?.key, shift, song ? firstChord(song) : null),
    [song, shift],
  );
  const renderChord = (chord: string) => prettyAccidentals(transposeChord(chord, shift, accidentals));

  const hasContent = content.trim().length > 0;
  const pdfVisible = Boolean(pdfUrl) && showPdf;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-zinc-900 select-none dark:bg-black dark:text-zinc-100">
      <PrompterToolbar
        visible={barVisible}
        mode={mode}
        playing={playing || countIn.counting}
        mirror={mirror}
        title={title}
        backHref={backHref}
        minSpeed={minSpeed}
        maxSpeed={maxSpeed}
        speedStep={speedStep}
        defaultSpeed={initialSpeed}
        minFontSize={MIN_FONT}
        maxFontSize={MAX_FONT}
        defaultFontSize={initialFont}
        fontSizeInputRef={fontSizeInputRef}
        speedInputRef={speedInputRef}
        onModeChange={setMode}
        onPlayingToggle={togglePlay}
        onReset={reset}
        onSpeedInput={handleSpeedInput}
        onFontSizeInput={handleFontSizeInput}
        onMirrorChange={handleMirrorChange}
        onFullscreen={toggleFullscreen}
        onHide={() => setBarVisible(false)}
        pdfAvailable={Boolean(pdfUrl)}
        pdfVisible={pdfVisible}
        onTogglePdf={() => setShowPdf((v) => !v)}
        extraControls={
          <>
            {song && (
              <TransposeControl
                transpose={transpose}
                capo={capo}
                songKey={song.key}
                onChange={handleTransposeChange}
              />
            )}
            <CountInToggle label="3-2-1" />
            <PedalSettings
              actions={setlistNav ? ["forward", "back", "toggle", "next", "prev"] : ["forward", "back", "toggle"]}
            />
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          onClick={() => setBarVisible((v) => !v)}
          className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-[40%] h-px bg-emerald-500/35 dark:bg-emerald-400/35" />
          {hasContent ? (
            <div
              ref={textLayerRef}
              className={`break-words px-[6vw] pt-[45vh] pb-[60vh] leading-relaxed transition-[font-size] duration-150 ${
                song ? "" : "whitespace-pre-wrap"
              } ${mirror ? "[transform:scaleX(-1)]" : ""}`}
            >
              {song ? <ChordProText song={song} renderChord={renderChord} /> : content}
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

        {pdfVisible && pdfUrl && (
          <div className="flex min-h-0 flex-1 flex-col border-t border-black/10 md:border-l md:border-t-0 dark:border-white/10">
            <SyncedPdfPane ref={pdfPaneRef} url={pdfUrl} className="flex-1" />
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
      <CountInOverlay count={countIn.count} />
      <SetlistNavBar nav={setlistNav} />
    </div>
  );
}
