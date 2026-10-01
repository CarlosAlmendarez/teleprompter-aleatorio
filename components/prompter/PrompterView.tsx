"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrompterEngine } from "./usePrompterEngine";
import { PrompterToolbar } from "./PrompterToolbar";
import { ChordProText } from "./ChordProText";
import { ScriptText } from "./ScriptText";
import { ReadingSettings, useReadingPrefs } from "./ReadingSettings";
import { SessionTimer } from "./SessionTimer";
import { ToolsMenu, type ToolItem } from "./ToolsMenu";
import { useVoiceScroll, useVoiceSupported } from "./useVoiceScroll";
import { requestSecondScreen, secondScreenSupported, useOperatorLink } from "./useOperatorLink";
import { SyncedPdfPane, type PdfPaneHandle } from "@/components/pdf/SyncedPdfPane";
import { SetlistNavBar } from "@/components/setlists/SetlistNavBar";
import { useWakeLock } from "@/components/player/useWakeLock";
import { usePlayerSettings } from "@/components/player/usePlayerSettings";
import { TransposeControl } from "@/components/player/TransposeControl";
import { usePedal, usePedalConfig } from "@/components/player/usePedal";
import { PedalSettings } from "@/components/player/PedalSettings";
import { CountInOverlay, useCountIn, useCountInPref } from "@/components/player/useCountIn";
import type { SetlistNav } from "@/lib/setlists/types";
import type { DocumentMetadata } from "@/lib/db/schema";
import type { PrompterCommand, PrompterSnapshot } from "@/lib/player/prompterCommands";
import { resolvePlayerSettings, type PlayerSettings } from "@/lib/player/settings";
import { READING_FONTS, READING_THEMES } from "@/lib/player/reading";
import { remainingSeconds } from "@/lib/player/timing";
import { SECTION_LABEL, firstChord, parseChordPro } from "@/lib/chordpro/parse";
import { parseScript, tokenizeScript } from "@/lib/script/parse";
import { accidentalsForShift, prettyAccidentals, transposeChord } from "@/lib/music/transpose";

const MIN_FONT = 18;
const MAX_FONT = 90;
const DEFAULT_FONT = 40;
const DEFAULT_SPEED = 40;
const ARROW_NUDGE_PX = 80;
const PEDAL_SCREENS = 0.6;
const WORD_HIGHLIGHT = ["bg-emerald-500/25"];

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

/** Vertical offset of `el` inside `container`, from layout (ignores transforms). */
function offsetWithin(el: HTMLElement, container: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

export function PrompterView({
  documentId,
  format = "text",
  title,
  content,
  backHref,
  pdfUrl,
  metadata = null,
  setlistNav = null,
  readerLinkId = null,
  readOnly = false,
}: {
  documentId: string;
  format?: "text" | "chordpro";
  title: string;
  content: string;
  backHref: string;
  pdfUrl?: string | null;
  metadata?: DocumentMetadata | null;
  setlistNav?: SetlistNav | null;
  /** Set when this window is the reader screen driven by an operator window. */
  readerLinkId?: string | null;
  /** Shared link: nothing is saved back to the owner's document. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const isReader = readerLinkId !== null;
  const viewportRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fontSizeInputRef = useRef<HTMLInputElement>(null);
  const speedInputRef = useRef<HTMLInputElement>(null);
  const pdfPaneRef = useRef<PdfPaneHandle>(null);
  const highlightedRef = useRef<Element | null>(null);
  const [showPdf, setShowPdf] = useState(Boolean(pdfUrl) && !isReader);

  // Settings resolved once on mount: document's own, then the setlist step's.
  const [initial] = useState(() => resolvePlayerSettings(metadata, setlistNav?.overrides));
  const initialFont = Math.min(MAX_FONT, Math.max(MIN_FONT, initial.fontSize ?? DEFAULT_FONT));
  const initialSpeed = initial.speed ?? DEFAULT_SPEED;
  const fontSizeRef = useRef(initialFont);
  const { save: saveSetting } = usePlayerSettings({
    documentId,
    playback: metadata?.playback,
    setlistNav,
    readOnly,
  });

  const song = useMemo(() => (format === "chordpro" ? parseChordPro(content) : null), [format, content]);
  const script = useMemo(() => (format === "text" ? parseScript(content) : null), [format, content]);
  const tokenized = useMemo(() => (script ? tokenizeScript(script.lines) : null), [script]);
  const sections = useMemo(() => {
    if (script) return script.sections.map((s) => ({ id: s.id, title: s.title }));
    if (!song) return [];
    const seen: Record<string, number> = {};
    return song.sections.flatMap((s, i) => {
      if (s.type === "none") return [];
      seen[s.type] = (seen[s.type] ?? 0) + 1;
      return [{ id: `cp-sec-${i}`, title: s.label ?? `${SECTION_LABEL[s.type]} ${seen[s.type]}` }];
    });
  }, [script, song]);

  const [transpose, setTranspose] = useState(initial.transpose ?? 0);
  const [capo, setCapo] = useState(initial.capo ?? song?.capo ?? 0);
  const [targetSec, setTargetSec] = useState<number | null>(metadata?.durationSec ?? null);
  const [toolsDialog, setToolsDialog] = useState<"pedal" | "reading" | null>(null);
  const [progress, setProgress] = useState<{ position: number; remainingSec: number | null }>({
    position: initial.position ?? 0,
    remainingSec: null,
  });
  const [remote, setRemote] = useState<PrompterSnapshot | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

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
  } = usePrompterEngine(viewportRef, { initialSpeed, initialMirror: initial.mirror ?? false });

  const reading = useReadingPrefs();
  const theme = READING_THEMES[reading.theme];
  const pedalConfig = usePedalConfig();
  useWakeLock();
  const countIn = useCountIn();
  const [countInEnabled, setCountInEnabled] = useCountInPref();
  const [barVisible, setBarVisible] = useState(!isReader);
  const voiceAvailable = useVoiceSupported();
  const [hintVisible, setHintVisible] = useState(true);

  const voice = useVoiceScroll({
    words: tokenized?.words ?? [],
    lang: typeof navigator !== "undefined" && navigator.language ? navigator.language : "es-ES",
    onWord: scrollToWord,
  });

  const link = useOperatorLink({
    readerLinkId,
    onCommand: apply,
    onInit: applyInit,
    onRemoteState: followRemote,
    getSnapshot: snapshot,
  });
  const linked = link.role === "controller" && link.connected;
  const lastPersisted = useRef<PlayerSettings>({});

  // ---------------------------------------------------------------------------
  // Viewport helpers
  // ---------------------------------------------------------------------------

  function guidePx(): number {
    return ((viewportRef.current?.clientHeight ?? 0) * reading.guide.position) / 100;
  }

  function currentPosition(): { position: number; max: number } {
    const el = viewportRef.current;
    const max = el ? Math.max(el.scrollHeight - el.clientHeight, 0) : 0;
    return { position: el && max > 0 ? el.scrollTop / max : 0, max };
  }

  function scrollToFraction(value: number, smooth = false) {
    const el = viewportRef.current;
    if (!el) return;
    const top = Math.min(1, Math.max(0, value)) * Math.max(el.scrollHeight - el.clientHeight, 0);
    el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  function scrollToElement(target: HTMLElement) {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: offsetWithin(target, el) - guidePx(), behavior: "smooth" });
  }

  function scrollToWord(index: number) {
    const span = textLayerRef.current?.querySelector<HTMLElement>(`[data-w="${index}"]`);
    if (!span) return;
    highlightedRef.current?.classList.remove(...WORD_HIGHLIGHT);
    span.classList.add(...WORD_HIGHLIGHT);
    highlightedRef.current = span;
    scrollToElement(span);
  }

  function applyFontSize(value: number) {
    fontSizeRef.current = value;
    if (textLayerRef.current) textLayerRef.current.style.fontSize = `${value}px`;
    if (fontSizeInputRef.current) fontSizeInputRef.current.value = String(value);
  }

  function syncSpeedSlider() {
    if (speedInputRef.current) speedInputRef.current.value = String(speedRef.current);
  }

  // ---------------------------------------------------------------------------
  // Control layer: every action becomes a command. Locally (or in the reader)
  // it is applied here; in a linked operator window it is sent to the reader.
  // ---------------------------------------------------------------------------

  function save(change: PlayerSettings) {
    if (isReader || linked) return; // the operator saves from the reader's reports
    saveSetting(change);
  }

  function togglePlayLocal() {
    if (countIn.isCounting()) return countIn.cancel();
    if (voice.active) return voice.stop();
    if (!playing && mode === "auto" && countInEnabled) countIn.start(3, 1000, () => setPlaying(true));
    else setPlaying(!playing);
  }

  function apply(command: PrompterCommand) {
    switch (command.type) {
      case "toggle":
        return togglePlayLocal();
      case "reset":
        return reset();
      case "scrollBy": {
        const el = viewportRef.current;
        return el?.scrollBy({ top: command.screens * el.clientHeight, behavior: "smooth" });
      }
      case "nudge":
        return nudge(command.px);
      case "scrollToFraction":
        return scrollToFraction(command.value, true);
      case "jumpTo": {
        const target = textLayerRef.current?.querySelector<HTMLElement>(`#${CSS.escape(command.anchor)}`);
        if (target) scrollToElement(target);
        return;
      }
      case "setSpeed":
        setSpeed(command.value);
        syncSpeedSlider();
        return save({ speed: speedRef.current });
      case "nudgeSpeed":
        changeSpeed(command.delta);
        syncSpeedSlider();
        return save({ speed: speedRef.current });
      case "setFontSize":
        applyFontSize(command.value);
        return save({ fontSize: command.value });
      case "setMirror":
        setMirror(command.value);
        return save({ mirror: command.value });
      case "setMode":
        return setMode(command.value);
      case "setTranspose":
        setTranspose(command.transpose);
        setCapo(command.capo);
        return save({ transpose: command.transpose, capo: command.capo });
    }
  }

  function dispatch(command: PrompterCommand) {
    if (linked) link.send(command);
    else apply(command);
  }

  function snapshot(): PrompterSnapshot {
    const { position, max } = currentPosition();
    return {
      playing,
      counting: countIn.isCounting(),
      mode,
      speed: speedRef.current,
      fontSize: fontSizeRef.current,
      mirror,
      position,
      remainingSec: mode === "auto" && !voice.active ? remainingSeconds(position, max, speedRef.current) : null,
      transpose,
      capo,
    };
  }

  // Reader: take the operator's current settings when the link opens.
  function applyInit(state: PrompterSnapshot) {
    setSpeed(state.speed);
    syncSpeedSlider();
    applyFontSize(state.fontSize);
    setMirror(state.mirror);
    setMode(state.mode);
    setTranspose(state.transpose);
    setCapo(state.capo);
    requestAnimationFrame(() => scrollToFraction(state.position));
  }

  // Operator: mirror the reader's state, and remember what changed.
  function followRemote(state: PrompterSnapshot) {
    setRemote(state);
    setProgress({ position: state.position, remainingSec: state.remainingSec });
    scrollToFraction(state.position);
    if (speedInputRef.current) speedInputRef.current.value = String(state.speed);
    applyFontSize(state.fontSize);
    setTranspose(state.transpose);
    setCapo(state.capo);
    const change: PlayerSettings = {};
    const last = lastPersisted.current;
    for (const key of ["speed", "fontSize", "mirror", "transpose", "capo"] as const) {
      if (last[key] !== state[key]) Object.assign(change, { [key]: state[key] });
    }
    if (!setlistNav) change.position = Math.round(state.position * 1000) / 1000;
    lastPersisted.current = { ...last, ...change };
    if (Object.keys(change).length > 0) saveSetting(change);
  }

  // ---------------------------------------------------------------------------
  // Inputs: keyboard, pedal, toolbar
  // ---------------------------------------------------------------------------

  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  });

  usePedal({
    forward: () => dispatch({ type: "scrollBy", screens: PEDAL_SCREENS }),
    back: () => dispatch({ type: "scrollBy", screens: -PEDAL_SCREENS }),
    toggle: () => dispatch({ type: "toggle" }),
    next: setlistNav?.next ? () => router.push(setlistNav.next!.href) : undefined,
    prev: setlistNav?.prev ? () => router.push(setlistNav.prev!.href) : undefined,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const send = dispatchRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        send({ type: "toggle" });
      } else if (e.code === "ArrowDown") {
        send({ type: "nudge", px: ARROW_NUDGE_PX });
      } else if (e.code === "ArrowUp") {
        send({ type: "nudge", px: -ARROW_NUDGE_PX });
      } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        send({ type: "nudgeSpeed", delta: e.code === "ArrowRight" ? speedStep : -speedStep });
      } else if (e.key === "m" || e.key === "M") {
        send({ type: "setMode", value: mode === "auto" ? "manual" : "auto" });
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape" && !isReader) {
        router.push(backHref);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, speedStep, router, backHref, isReader]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function toggleVoice() {
    if (voice.active) return voice.stop();
    setPlaying(false);
    // Start from the first word at or below the reading guide.
    const el = viewportRef.current;
    const spans = textLayerRef.current?.querySelectorAll<HTMLElement>("[data-w]") ?? [];
    let from = 0;
    if (el) {
      const guide = el.scrollTop + guidePx() - 4;
      for (const span of spans) {
        if (offsetWithin(span, el) >= guide) {
          from = Number(span.dataset.w);
          break;
        }
      }
    }
    voice.start(from);
  }

  function openReader() {
    const ok = link.openReader((id) => `${window.location.pathname}?view=reader&link=${id}`);
    if (!ok) setLinkNotice("El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.");
    else {
      setPlaying(false);
      voice.stop();
      setLinkNotice(null);
    }
  }

  function saveTarget(seconds: number | null) {
    setTargetSec(seconds);
    void fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { durationSec: seconds } }),
    }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timeout = setTimeout(() => setHintVisible(false), 6000);
    return () => clearTimeout(timeout);
  }, []);

  // Apply the remembered font size, then (outside a setlist) jump back to
  // where the reader left off once the text has laid out.
  useEffect(() => {
    if (textLayerRef.current) textLayerRef.current.style.fontSize = `${initialFont}px`;
    const position = initial.position;
    if (!position || isReader) return;
    const frame = requestAnimationFrame(() => scrollToFraction(position));
    return () => cancelAnimationFrame(frame);
  }, [initial, initialFont, isReader]);

  // Progress for the timer (and, in the reader, a report to the operator).
  useEffect(() => {
    if (linked) return; // the operator gets progress from the reader
    const id = setInterval(
      () => {
        const snap = snapshot();
        setProgress((p) =>
          Math.abs(p.position - snap.position) < 0.001 && p.remainingSec === snap.remainingSec
            ? p
            : { position: snap.position, remainingSec: snap.remainingSec },
        );
        if (isReader && link.connected) link.publish(snap);
      },
      isReader ? 200 : 500,
    );
    return () => clearInterval(id);
  });

  // The operator's own engine never runs while linked.
  useEffect(() => {
    if (linked) setPlaying(false);
  }, [linked, setPlaying]);

  function handleViewportScroll() {
    const { position } = currentPosition();
    pdfPaneRef.current?.seekFraction(position);
    if (link.role === "local") save({ position: Math.round(position * 1000) / 1000 });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const shift = transpose - capo;
  const accidentals = useMemo(
    () => accidentalsForShift(song?.key, shift, song ? firstChord(song) : null),
    [song, shift],
  );
  const renderChord = (chord: string) => prettyAccidentals(transposeChord(chord, shift, accidentals));

  const hasContent = content.trim().length > 0;
  const pdfVisible = Boolean(pdfUrl) && showPdf;
  const shown = linked && remote ? remote : null;
  const displayPlaying = shown ? shown.playing || shown.counting : playing || countIn.counting;
  const displayMode = shown ? shown.mode : mode;
  const displayMirror = shown ? shown.mirror : mirror;
  // The operator reads normally; mirrors apply on the screen being read.
  const applyMirrors = !linked;
  const canVoice = format === "text" && !isReader && !linked && voiceAvailable && (tokenized?.words.length ?? 0) > 0;

  const tools: ToolItem[] = [
    {
      id: "countin",
      label: "Cuenta atrás 3-2-1",
      active: countInEnabled,
      onSelect: () => setCountInEnabled(!countInEnabled),
    },
    { id: "pedal", label: "Pedal Bluetooth…", active: pedalConfig.enabled, onSelect: () => setToolsDialog("pedal") },
    { id: "reading", label: "Lectura: letra, colores, guía…", onSelect: () => setToolsDialog("reading") },
  ];
  if (!isReader) {
    tools.push(
      link.role === "controller"
        ? { id: "reader", label: "Cerrar pantalla de lectura", active: true, onSelect: link.closeReader }
        : {
            id: "reader",
            label: "Abrir pantalla de lectura",
            hint: "Otra ventana muestra el texto; esta la controla",
            onSelect: openReader,
          },
    );
    if (link.role === "controller" && secondScreenSupported()) {
      tools.push({
        id: "screen",
        label: "Mover al segundo monitor",
        onSelect: () => void requestSecondScreen(link.readerWindow.current),
      });
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-zinc-900 select-none dark:bg-black dark:text-zinc-100">
      <PrompterToolbar
        visible={barVisible}
        mode={displayMode}
        playing={displayPlaying}
        mirror={displayMirror}
        title={link.role === "controller" ? `${title} · ${link.connected ? "operador" : "conectando…"}` : title}
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
        onModeChange={(value) => dispatch({ type: "setMode", value })}
        onPlayingToggle={() => dispatch({ type: "toggle" })}
        onReset={() => dispatch({ type: "reset" })}
        onSpeedInput={(value) => dispatch({ type: "setSpeed", value })}
        onFontSizeInput={(value) => dispatch({ type: "setFontSize", value })}
        onMirrorChange={(value) => dispatch({ type: "setMirror", value })}
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
                onChange={(next) => dispatch({ type: "setTranspose", ...next })}
              />
            )}
            {sections.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && dispatch({ type: "jumpTo", anchor: e.target.value })}
                aria-label="Ir a sección"
                className="max-w-40 rounded-lg border border-black/15 bg-black/5 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-zinc-800"
              >
                <option value="">Ir a sección…</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
            {canVoice && (
              <button
                onClick={toggleVoice}
                aria-pressed={voice.active}
                title="El texto avanza siguiendo tu voz"
                className={`${BUTTON_CLASS} ${voice.active ? "!border-red-500 !bg-red-500/15" : ""}`}
              >
                {voice.active ? "● Escuchando" : "🎤 Voz"}
              </button>
            )}
            <ToolsMenu items={tools} />
          </>
        }
      />

      {(voice.error || linkNotice) && (
        <div role="alert" className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-black">
          {linkNotice ??
            (voice.error === "permission"
              ? "Sin permiso para el micrófono. Actívalo en la configuración del sitio."
              : voice.error === "microphone"
                ? "No se detecta ningún micrófono."
              : voice.error === "network"
                ? "El reconocimiento de voz necesita conexión a internet."
                : "Este navegador no permite reconocimiento de voz.")}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* The guide sits outside the scroller so it stays put while the text
            moves; the vertical mirror flips both together. */}
        <div
          className={`relative flex min-h-0 flex-1 flex-col ${theme.surface} ${
            applyMirrors && reading.mirrorVertical ? "[transform:scaleY(-1)]" : ""
          }`}
        >
          {reading.guide.show && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 bg-emerald-500/40 dark:bg-emerald-400/40"
              style={{ top: `${reading.guide.position}%`, height: reading.guide.thickness }}
            />
          )}
          <div
            ref={viewportRef}
            onScroll={handleViewportScroll}
            onClick={() => setBarVisible((v) => !v)}
            className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
          >
            {hasContent ? (
              <div
                ref={textLayerRef}
                style={{
                  fontFamily: READING_FONTS[reading.font].stack,
                  lineHeight: reading.lineHeight,
                  paddingLeft: `${reading.margin}vw`,
                  paddingRight: `${reading.margin}vw`,
                  paddingTop: `${reading.guide.position + 5}vh`,
                  textAlign: reading.align,
                }}
                className={`break-words pb-[60vh] transition-[font-size] duration-150 ${
                  applyMirrors && mirror ? "[transform:scaleX(-1)]" : ""
                }`}
              >
                {song ? (
                  <ChordProText song={song} renderChord={renderChord} />
                ) : script && tokenized ? (
                  <ScriptText lines={script.lines} tokens={tokenized.tokens} noteClass={theme.note} />
                ) : null}
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
        </div>

        {pdfVisible && pdfUrl && (
          <div className="flex min-h-0 flex-1 flex-col border-t border-black/10 md:border-l md:border-t-0 dark:border-white/10">
            <SyncedPdfPane ref={pdfPaneRef} url={pdfUrl} className="flex-1" />
          </div>
        )}
      </div>

      {isReader && (
        <div className="fixed right-3 top-3 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {link.connected ? "Pantalla de lectura · controlada por el operador" : "Conectando con el operador…"}
          </span>
          <button onClick={toggleFullscreen} className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            ⛶ Pantalla completa
          </button>
        </div>
      )}

      <div
        className={`pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/10 px-3 py-1 text-xs text-zinc-500 transition-opacity duration-1000 dark:bg-black/40 dark:text-zinc-400 ${
          hintVisible && !isReader ? "opacity-80" : "opacity-0"
        }`}
      >
        Toca la pantalla para mostrar/ocultar controles · Espacio = play/pausa
      </div>
      <SessionTimer
        playing={displayPlaying || voice.active}
        position={progress.position}
        remainingSec={progress.remainingSec}
        targetSec={targetSec}
        onTargetChange={isReader || readOnly ? undefined : saveTarget}
      />
      <CountInOverlay count={countIn.count} />
      {!isReader && <SetlistNavBar nav={setlistNav} />}
      <PedalSettings
        open={toolsDialog === "pedal"}
        onOpenChange={(open) => setToolsDialog(open ? "pedal" : null)}
        actions={setlistNav ? ["forward", "back", "toggle", "next", "prev"] : ["forward", "back", "toggle"]}
      />
      <ReadingSettings open={toolsDialog === "reading"} onClose={() => setToolsDialog(null)} />
    </div>
  );
}
