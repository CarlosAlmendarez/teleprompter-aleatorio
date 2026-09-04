"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SyncedPdfPane, type PdfPaneHandle } from "@/components/pdf/SyncedPdfPane";
import type { ChordChart } from "@/lib/musicxml/parseChordChart";
import type { LyricSegment } from "@/lib/musicxml/parseLyricChart";
import type { DocumentPdfAttachment } from "@/lib/db/schema";

const MIN_SPEED_PCT = 50;
const MAX_SPEED_PCT = 150;
const SPEED_STEP = 5;

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

function findActiveIndex(items: Array<{ startSec: number }>, elapsedSec: number): number {
  if (items.length === 0) return 0;
  if (elapsedSec <= 0) return 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (elapsedSec >= items[i].startSec) return i;
  }
  return 0;
}

export function ChordChartPlayer({
  title,
  data,
  lyricSegments = [],
  backHref,
  pdf,
}: {
  title: string;
  data: ChordChart;
  lyricSegments?: LyricSegment[];
  backHref: string;
  pdf?: DocumentPdfAttachment | null;
}) {
  const router = useRouter();
  const measures = data.measures;
  const measureByNumber = new Map(measures.map((m) => [m.number, m]));

  const [playing, setPlayingState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeLyricIndex, setActiveLyricIndex] = useState(0);
  const [barVisible, setBarVisible] = useState(true);
  const [showPdf, setShowPdf] = useState(Boolean(pdf?.url));

  // Playback clock lives in refs — the rAF loop only reads/writes these and
  // calls setActiveIndex on measure-boundary crossings (a handful of times
  // per song), never on every frame, so it never drives a 60fps re-render.
  const speedRef = useRef(100);
  const elapsedBaseRef = useRef(0);
  const startPerfRef = useRef(0);
  const rafId = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const activeLyricIndexRef = useRef(0);
  const measureElRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pdfPaneRef = useRef<PdfPaneHandle>(null);

  // measure number → seconds from song start, for PDF anchor interpolation.
  const measureStartSec = useMemo(
    () => new Map(measures.map((m) => [Number(m.number), m.startSec])),
    [measures],
  );

  function currentElapsed(): number {
    if (!playingState()) return elapsedBaseRef.current;
    return elapsedBaseRef.current + ((performance.now() - startPerfRef.current) / 1000) * (speedRef.current / 100);
  }
  function playingState() {
    return rafId.current !== null;
  }

  function syncPdf(elapsed: number) {
    pdfPaneRef.current?.seekSeconds(elapsed);
  }

  function step() {
    const elapsed = currentElapsed();
    syncPdf(elapsed);
    if (elapsed >= data.totalDurationSec) {
      elapsedBaseRef.current = data.totalDurationSec;
      stopLoop();
      setPlayingState(false);
      const lastIndex = measures.length - 1;
      if (activeIndexRef.current !== lastIndex) {
        activeIndexRef.current = lastIndex;
        setActiveIndex(lastIndex);
      }
      const lastLyricIndex = lyricSegments.length - 1;
      if (lastLyricIndex >= 0 && activeLyricIndexRef.current !== lastLyricIndex) {
        activeLyricIndexRef.current = lastLyricIndex;
        setActiveLyricIndex(lastLyricIndex);
      }
      return;
    }
    const index = findActiveIndex(measures, elapsed);
    if (index !== activeIndexRef.current) {
      activeIndexRef.current = index;
      setActiveIndex(index);
    }
    if (lyricSegments.length > 0) {
      const lyricIndex = findActiveIndex(lyricSegments, elapsed);
      if (lyricIndex !== activeLyricIndexRef.current) {
        activeLyricIndexRef.current = lyricIndex;
        setActiveLyricIndex(lyricIndex);
      }
    }
    rafId.current = requestAnimationFrame(step);
  }

  function stopLoop() {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }

  function setPlaying(next: boolean) {
    if (next === playingState()) return;
    if (next) {
      startPerfRef.current = performance.now();
      rafId.current = requestAnimationFrame(step);
    } else {
      elapsedBaseRef.current = currentElapsed();
      syncPdf(elapsedBaseRef.current);
      stopLoop();
    }
    setPlayingState(next);
  }

  function reset() {
    stopLoop();
    elapsedBaseRef.current = 0;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    activeLyricIndexRef.current = 0;
    setActiveLyricIndex(0);
    setPlayingState(false);
    syncPdf(0);
  }

  function handleSpeedInput(value: number) {
    if (playingState()) {
      elapsedBaseRef.current = currentElapsed();
      startPerfRef.current = performance.now();
    }
    speedRef.current = value;
  }

  useEffect(() => stopLoop, []);

  useEffect(() => {
    measureElRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!playingState());
      } else if (e.key === "Escape") {
        router.push(backHref);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, backHref]);

  const activeMeasure = measures[activeIndex];
  const nextMeasure = measures[activeIndex + 1];
  const hasLyrics = lyricSegments.length > 0;
  const activeLyric = lyricSegments[activeLyricIndex];
  const nextLyric = lyricSegments[activeLyricIndex + 1];
  const activeLyricChords = activeLyric ? measureByNumber.get(activeLyric.measureNumber)?.chords : undefined;
  const pdfVisible = Boolean(pdf?.url) && showPdf;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-zinc-900 select-none dark:bg-black dark:text-zinc-100">
      <div
        className={`flex flex-wrap items-center gap-2 border-b border-black/10 bg-zinc-100 px-3 py-2 text-zinc-900 transition-transform duration-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 ${
          barVisible ? "" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <Link href={backHref} title="Cerrar" aria-label="Cerrar" className={BUTTON_CLASS}>
          ✕
        </Link>
        <span className="mr-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{title}</span>

        <button onClick={() => setPlaying(!playing)} className={BUTTON_CLASS}>
          {playing ? "⏸ Pausar" : "▶ Reproducir"}
        </button>
        <button onClick={reset} className={BUTTON_CLASS}>
          ⟲ Inicio
        </button>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Tempo</label>
          <input
            type="range"
            min={MIN_SPEED_PCT}
            max={MAX_SPEED_PCT}
            step={SPEED_STEP}
            defaultValue={100}
            onInput={(e) => handleSpeedInput(Number(e.currentTarget.value))}
            className="w-24 accent-emerald-500 dark:accent-emerald-400"
          />
        </div>

        <div className="flex-1" />
        {pdf?.url && (
          <button
            onClick={() => setShowPdf((v) => !v)}
            className={BUTTON_CLASS}
            aria-pressed={pdfVisible}
          >
            {pdfVisible ? "⊟ Ocultar PDF" : "⊞ Ver PDF"}
          </button>
        )}
        <ThemeToggle className={BUTTON_CLASS} />
        <button onClick={() => setBarVisible(false)} className={BUTTON_CLASS}>
          ▲ Ocultar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          {hasLyrics ? (
            <div
              onClick={() => setBarVisible((v) => !v)}
              className="flex flex-col items-center justify-center gap-2 border-b border-black/10 bg-black/[.02] px-4 py-8 text-center dark:border-white/10 dark:bg-white/[.03]"
            >
              {nextLyric && (
                <div className="text-sm text-zinc-400 dark:text-zinc-600">
                  {nextLyric.lines[0] ?? ""}
                </div>
              )}
              {activeLyricChords && activeLyricChords.length > 0 && (
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {activeLyricChords.join(" · ")}
                </div>
              )}
              <div className="whitespace-pre-wrap text-3xl font-semibold leading-snug sm:text-4xl">
                {activeLyric?.lines.join("\n") || "—"}
              </div>
            </div>
          ) : (
            <div
              onClick={() => setBarVisible((v) => !v)}
              className="flex items-center justify-center gap-10 border-b border-black/10 bg-black/[.02] px-4 py-6 dark:border-white/10 dark:bg-white/[.03]"
            >
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Compás {activeMeasure?.number ?? "—"}
                </div>
                <div className="text-6xl font-bold sm:text-7xl">
                  {activeMeasure?.chords.join(" · ") || "—"}
                </div>
              </div>
              {nextMeasure && nextMeasure.chords.length > 0 && (
                <div className="text-center text-zinc-400 dark:text-zinc-500">
                  <div className="text-xs uppercase tracking-wide">Sigue</div>
                  <div className="text-2xl font-semibold">{nextMeasure.chords.join(" · ")}</div>
                </div>
              )}
            </div>
          )}

          <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {measures.map((measure, i) => (
                <div
                  key={measure.number}
                  ref={(el) => {
                    measureElRefs.current[i] = el;
                  }}
                  className={`flex min-h-20 flex-col justify-between rounded-xl border p-3 transition-colors ${
                    i === activeIndex
                      ? "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/10"
                      : "border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.03]"
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {measure.number}
                  </span>
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                    {measure.chords.length > 0 ? (
                      measure.chords.map((chord, ci) => (
                        <span key={ci} className="text-xl font-bold leading-none">
                          {chord}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {pdfVisible && pdf?.url && (
          <div className="flex min-h-0 flex-1 flex-col border-t border-black/10 md:border-l md:border-t-0 dark:border-white/10">
            <SyncedPdfPane
              ref={pdfPaneRef}
              url={pdf.url}
              anchors={pdf.anchors}
              measureStartSec={measureStartSec}
              totalDurationSec={data.totalDurationSec}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
