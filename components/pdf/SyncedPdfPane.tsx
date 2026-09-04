"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfAnchor } from "@/lib/db/schema";
import { anchorControlPoints, scrollAtTime } from "@/lib/pdf/anchors";

const MAX_PAGES = 60;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

export type PdfPaneHandle = {
  /** Scroll to `fraction` (0..1) of the scrollable range. */
  seekFraction: (fraction: number) => void;
  /** Scroll so elapsed `seconds` of playback lines up with the PDF. */
  seekSeconds: (seconds: number) => void;
};

type Props = {
  url: string;
  /** `page → measure` alignment points (musicxml split view only). */
  anchors?: PdfAnchor[];
  /** measure number → seconds from song start, for anchor interpolation. */
  measureStartSec?: Map<number, number>;
  totalDurationSec?: number;
  /** Show zoom controls (standalone viewer). */
  interactive?: boolean;
  className?: string;
  onLoad?: (info: { pageCount: number }) => void;
  onError?: (message: string) => void;
};

/**
 * Renders every page of a PDF to stacked canvases in a scroll container and
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

  // Renders (or re-renders, on zoom/resize) every page to a fresh canvas strip.
  // `renderTokenRef` supersedes an in-flight run so a slow render can't clobber
  // a newer one. Only reads/writes refs, so it's stable across renders.
  const renderAll = useCallback(async () => {
    const strip = stripRef.current;
    const scroller = scrollRef.current;
    const pdf = pdfRef.current;
    if (!strip || !scroller || !pdf) return;

    const token = ++renderTokenRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const available = scroller.clientWidth - 24;
    if (available <= 0) return;

    const pageCount = Math.min(pdf.numPages, MAX_PAGES);
    const rendered = document.createElement("div");

    for (let n = 1; n <= pageCount; n++) {
      if (token !== renderTokenRef.current) return;
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const cssScale = (available / base.width) * zoomRef.current;
      const viewport = page.getViewport({ scale: cssScale * dpr });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      canvas.className = "mx-auto mb-2 block rounded bg-white shadow-sm";

      const wrapper = document.createElement("div");
      wrapper.appendChild(canvas);
      rendered.appendChild(wrapper);

      await page.render({ canvas, viewport }).promise;
      if (token !== renderTokenRef.current) return;
    }

    if (token !== renderTokenRef.current) return;
    strip.replaceChildren(...Array.from(rendered.children));
    // scrollTop value that brings each page's top to the container's top edge —
    // computed from rects so container padding / positioning don't skew it.
    const originTop = scroller.getBoundingClientRect().top - scroller.scrollTop;
    pageOffsetsRef.current = Array.from(strip.children).map(
      (child) => child.getBoundingClientRect().top - originTop,
    );
    lastWidthRef.current = scroller.clientWidth;
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
