// Plain-text scripts for the teleprompter, with two light conventions:
//   # Title           → a section heading (listed in the jump menu)
//   ((stage note))    → a direction shown dimmed, never read aloud
// The tokenizer numbers every spoken word so the voice follower and the
// renderer agree on word positions.

export type ScriptPart = { text: string; note: boolean };

export type ScriptLine =
  | { kind: "heading"; id: string; text: string }
  | { kind: "text"; parts: ScriptPart[] }
  | { kind: "blank" };

export type ScriptSection = { id: string; title: string };

export type ParsedScript = { lines: ScriptLine[]; sections: ScriptSection[] };

const HEADING_RE = /^\s*#{1,3}\s+(.+?)\s*$/;
const NOTE_RE = /\(\((.*?)\)\)/g;

function splitNotes(line: string): ScriptPart[] {
  const parts: ScriptPart[] = [];
  let last = 0;
  for (const match of line.matchAll(NOTE_RE)) {
    if (match.index > last) parts.push({ text: line.slice(last, match.index), note: false });
    parts.push({ text: match[1], note: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), note: false });
  return parts;
}

export function parseScript(content: string): ParsedScript {
  const lines: ScriptLine[] = [];
  const sections: ScriptSection[] = [];
  for (const raw of content.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = raw.match(HEADING_RE);
    if (heading) {
      const id = `sec-${sections.length + 1}`;
      sections.push({ id, title: heading[1] });
      lines.push({ kind: "heading", id, text: heading[1] });
    } else if (raw.trim() === "") {
      lines.push({ kind: "blank" });
    } else {
      lines.push({ kind: "text", parts: splitNotes(raw) });
    }
  }
  return { lines, sections };
}

/** Lower-case, accent-free, letters and digits only — for comparing words. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** A run of text; `word` is its index among spoken words, or null (space, note). */
export type ScriptToken = { text: string; word: number | null };

/**
 * Splits each line's parts into tokens and numbers the spoken words in
 * reading order. Headings and notes are not spoken, so their words get no
 * index. `words[i]` is the normalized form of word `i`.
 */
export function tokenizeScript(lines: ScriptLine[]): { tokens: ScriptToken[][][]; words: string[] } {
  const words: string[] = [];
  const tokens = lines.map((line) => {
    if (line.kind !== "text") return [];
    return line.parts.map((part) =>
      part.text.split(/(\s+)/).filter(Boolean).map((text): ScriptToken => {
        const norm = part.note ? "" : normalizeWord(text);
        if (!norm) return { text, word: null };
        words.push(norm);
        return { text, word: words.length - 1 };
      }),
    );
  });
  return { tokens, words };
}
