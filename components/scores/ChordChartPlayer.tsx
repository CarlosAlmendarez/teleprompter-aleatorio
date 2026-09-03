"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { ChordChart } from "@/lib/musicxml/parseChordChart";

const MIN_SPEED_PCT = 50;
const MAX_SPEED_PCT = 150;
const SPEED_STEP = 5;

const BUTTON_CLASS =
  "rounded-lg border border-black/15 bg-black/5 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5";

function findMeasureIndex(measures: ChordChart["measures"], elapsedSec: number): number {
  if (measures.length === 0) return 0;
  if (elapsedSec <= 0) return 0;
  for (let i = measures.length - 1; i >= 0; i--) {
    if (elapsedSec >= measures[i].startSec) return i;
  }
  return 0;
}

export function ChordChartPlayer({
  title,
  data,
  backHref,
}: {
  title: string;
  data: ChordChart;
  backHref: string;
}) {
  const router = useRouter();
  const measures = data.measures;

  const [playing, setPlayingState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [barVisible, setBarVisible] = useState(true);

  // Playback clock lives in refs — the rAF loop only reads/writes these and
  // calls setActiveIndex on measure-boundary crossings (a handful of times
  // per song), never on every frame, so it never drives a 60fps re-render.
  const speedRef = useRef(100);
  const elapsedBaseRef = useRef(0);
  const startPerfRef = useRef(0);
  const rafId = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const measureElRefs = useRef<Array<HTMLDivElement | null>>([]);

  function currentElapsed(): number {
    if (!playingState()) return elapsedBaseRef.current;
    return elapsedBaseRef.current + ((performance.now() - startPerfRef.current) / 1000) * (speedRef.current / 100);
  }
  function playingState() {
    return rafId.current !== null;
  }

  function step() {
    const elapsed = currentElapsed();
    if (elapsed >= data.totalDurationSec) {
      elapsedBaseRef.current = data.totalDurationSec;
      stopLoop();
      setPlayingState(false);
      const lastIndex = measures.length - 1;
      if (activeIndexRef.current !== lastIndex) {
        activeIndexRef.current = lastIndex;
        setActiveIndex(lastIndex);
      }
      return;
    }
    const index = findMeasureIndex(measures, elapsed);
    if (index !== activeIndexRef.current) {
      activeIndexRef.current = index;
      setActiveIndex(index);
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
      stopLoop();
    }
    setPlayingState(next);
  }

  function reset() {
    stopLoop();
    elapsedBaseRef.current = 0;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    setPlayingState(false);
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
        <ThemeToggle className={BUTTON_CLASS} />
        <button onClick={() => setBarVisible(false)} className={BUTTON_CLASS}>
          ▲ Ocultar
        </button>
      </div>

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
  );
}
