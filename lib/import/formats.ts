// File import: which document type each file becomes, and converters for
// formats we store as something else (OnSong → ChordPro, Word → script text).

import type { DocumentType } from "@/lib/types";

export type ImportKind = "pdf" | "musicxml" | "chordpro" | "onsong" | "docx" | "text";

const EXTENSIONS: Record<ImportKind, string[]> = {
  pdf: [".pdf"],
  musicxml: [".musicxml", ".xml"],
  chordpro: [".cho", ".crd", ".chopro", ".chordpro", ".pro"],
  onsong: [".onsong"],
  docx: [".docx"],
  text: [".txt", ".md"],
};

export const ACCEPTED_EXTENSIONS = Object.values(EXTENSIONS).flat();

/** The import route for a file name, or null when unsupported. */
export function detectImport(fileName: string): ImportKind | null {
  const lower = fileName.toLowerCase();
  for (const [kind, exts] of Object.entries(EXTENSIONS) as Array<[ImportKind, string[]]>) {
    if (exts.some((ext) => lower.endsWith(ext))) return kind;
  }
  return null;
}

/** Document type a kind is stored as. */
export function storedType(kind: ImportKind): DocumentType {
  if (kind === "pdf" || kind === "musicxml") return kind;
  if (kind === "chordpro" || kind === "onsong") return "chordpro";
  return "text";
}

/** File name without its extension, as a fallback title. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "Sin título";
}

// ---------------------------------------------------------------------------
// OnSong → ChordPro
// ---------------------------------------------------------------------------

const ONSONG_META = /^\s*(title|artist|author|key|tempo|capo|time|copyright|ccli|duration)\s*:\s*(.+?)\s*$/i;
const ONSONG_SECTION = /^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ][\wÁÉÍÓÚáéíóúñÑ .'-]{0,30}?)\s*:\s*$/;

function sectionDirective(label: string): { open: string; close: string } {
  const l = label.toLowerCase();
  if (/chorus|coro|estribillo/.test(l)) return { open: `{start_of_chorus: ${label}}`, close: "{end_of_chorus}" };
  if (/bridge|puente/.test(l)) return { open: `{start_of_bridge: ${label}}`, close: "{end_of_bridge}" };
  if (/verse|verso|estrofa/.test(l)) return { open: `{start_of_verse: ${label}}`, close: "{end_of_verse}" };
  return { open: `{comment: ${label}}`, close: "" };
}

/**
 * Converts an OnSong chart: the first line is the title, an optional second
 * line the artist, "Key: G"-style lines become directives, and "Verse 1:" /
 * "Chorus:" lines open sections. Inline [chords] are already ChordPro.
 */
export function onsongToChordPro(source: string): { title: string | null; content: string } {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let title: string | null = null;
  let header = true;
  let headerLines = 0;
  let close = "";

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (header) {
      if (line.trim() === "") {
        if (headerLines > 0) header = false;
        continue;
      }
      const meta = line.match(ONSONG_META);
      if (meta) {
        const key = meta[1].toLowerCase();
        const value = meta[2];
        if (key === "title") title = value;
        out.push(`{${key === "author" ? "artist" : key === "ccli" ? "meta: ccli" : key}: ${value}}`);
        headerLines++;
        continue;
      }
      if (!ONSONG_SECTION.test(line) && !line.includes("[") && headerLines < 2) {
        // Bare first lines: title, then artist.
        if (title === null) {
          title = line.trim();
          out.unshift(`{title: ${title}}`);
        } else out.push(`{artist: ${line.trim()}}`);
        headerLines++;
        continue;
      }
      header = false;
    }
    const section = line.match(ONSONG_SECTION);
    if (section) {
      if (close) out.push(close);
      const directive = sectionDirective(section[1]);
      out.push(directive.open);
      close = directive.close;
      continue;
    }
    out.push(line);
  }
  if (close) out.push(close);
  return { title, content: out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n" };
}

// ---------------------------------------------------------------------------
// Word (.docx, via mammoth's HTML) → script text
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Turns the HTML mammoth produces from a .docx into teleprompter script text:
 * headings become "# Section" lines, list items "- item", paragraphs are
 * separated by a blank line, and all other markup is dropped.
 */
export function docxHtmlToScript(html: string): string {
  const text = html
    .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_, inner: string) => `\n# ${inner}\n\n`)
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n$1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return (
    decodeEntities(text)
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/g, "").replace(/^# +/, "# "))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}
