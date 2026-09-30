// How the teleprompter text looks, per device (a phone and a studio monitor
// want different margins and sizes). Font size stays per document.

export type ReadingFont = "sans" | "serif" | "mono" | "rounded";
export type ReadingTheme = "app" | "dark" | "light" | "contrast";

export type ReadingPrefs = {
  font: ReadingFont;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  /** Horizontal margin, % of the viewport width on each side. */
  margin: number;
  theme: ReadingTheme;
  align: "left" | "center";
  guide: { show: boolean; /** % from the top */ position: number; /** px */ thickness: number };
};

export const DEFAULT_READING: ReadingPrefs = {
  font: "sans",
  lineHeight: 1.6,
  margin: 6,
  theme: "app",
  align: "left",
  guide: { show: true, position: 40, thickness: 1 },
};

export const READING_FONTS: Record<ReadingFont, { label: string; stack: string }> = {
  sans: { label: "Sans", stack: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" },
  serif: { label: "Serif", stack: "Georgia, 'Times New Roman', ui-serif, serif" },
  mono: { label: "Mono", stack: "var(--font-geist-mono), ui-monospace, monospace" },
  rounded: { label: "Redondeada", stack: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif" },
};

/** Tailwind classes for the reading surface; "app" follows the app theme. */
export const READING_THEMES: Record<ReadingTheme, { label: string; surface: string; note: string }> = {
  app: { label: "Como la app", surface: "", note: "text-amber-600 dark:text-amber-400" },
  dark: { label: "Blanco sobre negro", surface: "bg-black text-zinc-100", note: "text-amber-400" },
  light: { label: "Negro sobre blanco", surface: "bg-white text-zinc-900", note: "text-amber-700" },
  contrast: { label: "Alto contraste", surface: "bg-black text-yellow-300", note: "text-cyan-300" },
};

const STORAGE_KEY = "reading:prefs";
const CHANGE_EVENT = "reading-prefs-change";

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Validates stored prefs field by field, falling back to defaults. */
export function sanitizeReading(raw: unknown): ReadingPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ReadingPrefs>;
  const g = (r.guide && typeof r.guide === "object" ? r.guide : {}) as Partial<ReadingPrefs["guide"]>;
  const d = DEFAULT_READING;
  return {
    font: r.font && r.font in READING_FONTS ? r.font : d.font,
    lineHeight: clamp(r.lineHeight, 1.1, 2.4, d.lineHeight),
    margin: clamp(r.margin, 0, 25, d.margin),
    theme: r.theme && r.theme in READING_THEMES ? r.theme : d.theme,
    align: r.align === "center" ? "center" : "left",
    guide: {
      show: typeof g.show === "boolean" ? g.show : d.guide.show,
      position: clamp(g.position, 10, 80, d.guide.position),
      thickness: clamp(g.thickness, 1, 8, d.guide.thickness),
    },
  };
}

let cached: { raw: string; prefs: ReadingPrefs } | null = null;

export function readingSnapshot(): ReadingPrefs {
  let raw = "";
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {}
  if (!cached || cached.raw !== raw) {
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {}
    cached = { raw, prefs: sanitizeReading(parsed) };
  }
  return cached.prefs;
}

export function saveReading(prefs: ReadingPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeReading(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
