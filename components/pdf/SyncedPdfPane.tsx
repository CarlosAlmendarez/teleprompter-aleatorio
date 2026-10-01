"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { PdfAnchor } from "@/lib/db/schema";
import { anchorControlPoints, scrollAtTime } from "@/lib/pdf/anchors";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

export type PdfPaneHandle = {
  /** Scroll to `fraction` (0..1) of the scrollable range. */
  seekFraction: (fraction: number) => void;
  /** Scroll so elapsed `seconds` of playback lines up with the PDF. */
  seekSeconds: (seconds: number) => void;
  /** Smooth-scroll by most of a screen (pedal / page turn). */
  scrollByPage: (direction: 1 | -1) => void;
};

type Props = {
  url: string;
  /** `page → measure` alignment points (musicxml split view only). */
  anchors?: PdfAnchor[];
  /** measure number → seconds from song start, for anchor interpolation. */
  measureStartSec?: Map<number, number[]>;
  totalDurationSec?: number;
  /** Show zoom controls (standalone viewer). */
  interactive?: boolean;
  className?: string;
  onLoad?: (info: { pageCount: number }) => void;
  onError?: (message: string) => void;
};

/**
 * Renders a PDF as stacked, lazily painted pages in a scroll container and
 * exposes an imperative `seek*` handle. All seeking writes `scrollTop`
 * directly — no React state per frame — so the caller's rAF playback loop can
 * drive it without re-rendering this tree.
 */
export const SyncedPdfPane = forwardRef<PdfPaneHandle, Props>(function SyncedPdfPane(
  { url, anchors, measureStartSec, totalDurationSec, interactive = false, className, onLoad, onError },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const pageOffsetsRef = useRef<number[]>([]);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const zoomRef = useRef(1);
  const renderTokenRef = useRef(0);
  const lastWidthRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoomPct, setZoomPct] = useState(100);

  // Sync inputs flow through refs so the imperative handle stays current
  // without React needing to rebuild it.
  const anchorsRef = useRef(anchors);
  const measureStartSecRef = useRef(measureStartSec);
  const totalDurationRef = useRef(totalDurationSec);
  anchorsRef.current = anchors;
  measureStartSecRef.current = measureStartSec;
  totalDurationRef.current = totalDurationSec;

  useImperativeHandle(ref, () => ({
    scrollByPage(direction) {
      const el = scrollRef.current;
      el?.scrollBy({ top: direction * el.clientHeight * 0.85, behavior: "smooth" });
    },
    seekFraction(fraction) {
      const el = scrollRef.current;
      if (!el) return;
      const max = Math.max(el.scrollHeight - el.clientHeight, 0);
      el.scrollTop = clamp01(fraction) * max;
    },
    seekSeconds(seconds) {
      const el = scrollRef.current;
      if (!el) return;
      const total = totalDurationRef.current;
      if (!total || total <= 0) return;
      const max = Math.max(el.scrollHeight - el.clientHeight, 0);
      const points = anchorControlPoints({
        anchors: anchorsRef.current ?? [],
        measureStartSec: (m) => measureStartSecRef.current?.get(m),
        pageTop: (p) => pageOffsetsRef.current[p - 1],
        totalDurationSec: total,
        scrollMax: max,
      });
      el.scrollTop = scrollAtTime(points, seconds);
    },
  }));

  // Lays out (or re-lays out, on zoom/resize) one fixed-size placeholder per
  // page, then paints canvases lazily: an IntersectionObserver renders pages
  // as they approach the viewport and frees them once far away, so long PDFs
  // neither block on a full render nor hold hundreds of canvases in memory.
  // Placeholders have final dimensions up front, so page offsets (used for
  // anchor sync) are exact before any canvas exists. `renderTokenRef`
  // supersedes an in-flight layout so a slow run can't clobber a newer one.
  const renderAll = useCallback(async () => {
    const strip = stripRef.current;
    const scroller = scrollRef.current;
    const pdf = pdfRef.current;
    if (!strip || !scroller || !pdf) return;

    const token = ++renderTokenRef.current;
    observerRef.current?.disconnect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const available = scroller.clientWidth - 24;
    if (available <= 0) return;

    const slots: HTMLDivElement[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      if (token !== renderTokenRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const cssScale = (available / base.width) * zoomRef.current;
      const slot = document.createElement("div");
      slot.dataset.page = String(n);
      slot.dataset.scale = String(cssScale);
      slot.className = "mx-auto mb-2 rounded bg-white shadow-sm";
      slot.style.width = `${base.width * cssScale}px`;
      slot.style.height = `${base.height * cssScale}px`;
      slots.push(slot);
    }

    // Keep the reading position (as a fraction) across zoom/resize relayouts.
    const prevMax = scroller.scrollHeight - scroller.clientHeight;
    const prevFraction = prevMax > 0 ? scroller.scrollTop / prevMax : 0;

    strip.replaceChildren(...slots);
    // scrollTop value that brings each page's top to the container's top edge —
    // computed from rects so container padding / positioning don't skew it.
    const originTop = scroller.getBoundingClientRect().top - scroller.scrollTop;
    pageOffsetsRef.current = slots.map((slot) => slot.getBoundingClientRect().top - originTop);
    lastWidthRef.current = scroller.clientWidth;
    const nextMax = scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTop = prevFraction * Math.max(nextMax, 0);

    const tasks = new Map<HTMLDivElement, RenderTask>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slot = entry.target as HTMLDivElement;
          if (!entry.isIntersecting) {
            tasks.get(slot)?.cancel();
            tasks.delete(slot);
            slot.replaceChildren();
            continue;
          }
          if (slot.firstChild || tasks.has(slot)) continue;
          void (async () => {
            const page = await pdf.getPage(Number(slot.dataset.page));
            if (token !== renderTokenRef.current) return;
            const viewport = page.getViewport({ scale: Number(slot.dataset.scale) * dpr });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = "block h-full w-full rounded";
            const task = page.render({ canvas, viewport });
            tasks.set(slot, task);
            try {
              await task.promise;
              if (token === renderTokenRef.current && tasks.get(slot) === task) {
                slot.replaceChildren(canvas);
              }
            } catch {
              // Cancelled (scrolled away / superseded) — nothing to do.
            } finally {
              if (tasks.get(slot) === task) tasks.delete(slot);
            }
          })();
        }
      },
      // Pre-render roughly one screen above and below the viewport.
      { root: scroller, rootMargin: "100% 0px" },
    );
    slots.forEach((slot) => observer.observe(slot));
    observerRef.current = observer;
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: import("pdfjs-dist").PDFDocumentLoadingTask | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    setStatus("loading");
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        onLoad?.({ pageCount: pdf.numPages });
        await renderAll();

        resizeObserver = new ResizeObserver(() => {
          const scroller = scrollRef.current;
          if (!scroller || Math.abs(scroller.clientWidth - lastWidthRef.current) < 8) return;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => void renderAll(), 200);
        });
        if (scrollRef.current) resizeObserver.observe(scrollRef.current);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        onError?.(error instanceof Error ? error.message : "No se pudo cargar el PDF.");
      }
    })();

    return () => {
      cancelled = true;
      // Supersede any render loop still walking pages.
      renderTokenRef.current += 1;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      observerRef.current?.disconnect();
      void loadingTask?.destroy();
      pdfRef.current = null;
    };
    // onLoad/onError are caller callbacks, intentionally not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, renderAll]);

  function changeZoom(delta: number) {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((zoomRef.current + delta).toFixed(2))));
    if (next === zoomRef.current) return;
    zoomRef.current = next;
    setZoomPct(Math.round(next * 100));
    setStatus("loading");
    void renderAll();
  }

  return (
    <div className={`relative flex min-h-0 flex-col ${className ?? ""}`}>
      {interactive && (
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-1.5 text-xs dark:border-white/10">
          <button
            onClick={() => changeZoom(-ZOOM_STEP)}
            className="rounded border border-black/15 px-2 py-0.5 dark:border-white/15"
            aria-label="Alejar"
          >
            −
          </button>
          <span className="tabular-nums text-zinc-500">{zoomPct}%</span>
          <button
            onClick={() => changeZoom(ZOOM_STEP)}
            className="rounded border border-black/15 px-2 py-0.5 dark:border-white/15"
            aria-label="Acercar"
          >
            +
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-zinc-200/60 p-3 dark:bg-zinc-800/60"
      >
        <div ref={stripRef} className="relative mx-auto max-w-3xl" />
        {status === "loading" && (
          <p className="p-4 text-center text-sm text-zinc-500">Cargando PDF…</p>
        )}
        {status === "error" && (
          <p className="p-4 text-center text-sm text-red-500">No se pudo cargar el PDF.</p>
        )}
      </div>
    </div>
  );
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
