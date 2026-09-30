// ChordPro → structured song for the teleprompter: chords paired with the
// syllable they sit on, sections (verse/chorus/bridge/tab), comments, and the
// header directives (title, key, tempo, capo). Unknown directives are dropped
// so they never show up on stage. Spec: https://www.chordpro.org/chordpro/

export type ChordSegment = { chord: string | null; text: string };

export type ChordProLine =
  | { kind: "lyrics"; segments: ChordSegment[] }
  | { kind: "comment"; text: string }
  | { kind: "tab"; text: string }
  | { kind: "blank" };

export type SectionType = "verse" | "chorus" | "bridge" | "tab" | "none";

export type ChordProSection = { type: SectionType; label: string | null; lines: ChordProLine[] };

export type ChordProSong = {
  title: string | null;
  subtitle: string | null;
  artist: string | null;
  key: string | null;
  tempo: number | null;
  capo: number | null;
  sections: ChordProSection[];
};

const DIRECTIVE_RE = /^\s*\{\s*([a-z_-]+)\s*(?::\s*(.*?))?\s*\}\s*$/i;
const CHORD_RE = /\[([^\]]*)\]/g;

const SECTION_START: Record<string, SectionType> = {
  soc: "chorus",
  start_of_chorus: "chorus",
  sov: "verse",
  start_of_verse: "verse",
  sob: "bridge",
  start_of_bridge: "bridge",
  sot: "tab",
  start_of_tab: "tab",
};
const SECTION_END = new Set([
  "eoc",
  "end_of_chorus",
  "eov",
  "end_of_verse",
  "eob",
  "end_of_bridge",
  "eot",
  "end_of_tab",
]);
const COMMENT = new Set(["c", "comment", "ci", "comment_italic", "cb", "comment_box", "highlight"]);

export const SECTION_LABEL: Record<Exclude<SectionType, "none">, string> = {
  verse: "Verso",
  chorus: "Coro",
  bridge: "Puente",
  tab: "Tablatura",
};

function parseLyrics(line: string): ChordSegment[] {
  const segments: ChordSegment[] = [];
  let last = 0;
  let pendingChord: string | null = null;
  for (const match of line.matchAll(CHORD_RE)) {
    const text = line.slice(last, match.index);
    if (text || pendingChord !== null) segments.push({ chord: pendingChord, text });
    pendingChord = match[1].trim();
    last = match.index + match[0].length;
  }
  segments.push({ chord: pendingChord, text: line.slice(last) });
  return segments.filter((s, i) => i === 0 || s.chord !== null || s.text);
}

export function parseChordPro(source: string): ChordProSong {
  const song: ChordProSong = {
    title: null,
    subtitle: null,
    artist: null,
    key: null,
    tempo: null,
    capo: null,
    sections: [],
  };
  let current: ChordProSection = { type: "none", label: null, lines: [] };
  song.sections.push(current);

  const open = (type: SectionType, label: string | null) => {
    current = { type, label, lines: [] };
    song.sections.push(current);
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const directive = rawLine.match(DIRECTIVE_RE);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = directive[2]?.trim() || null;
      if (name in SECTION_START) open(SECTION_START[name], value);
      else if (SECTION_END.has(name)) open("none", null);
      else if (COMMENT.has(name)) {
        if (value) current.lines.push({ kind: "comment", text: value });
      } else if (name === "chorus") current.lines.push({ kind: "comment", text: value ?? "Coro" });
      else if (name === "title" || name === "t") song.title = value;
      else if (name === "subtitle" || name === "st") song.subtitle = value;
      else if (name === "artist") song.artist = value;
      else if (name === "key") song.key = value;
      else if (name === "tempo") song.tempo = value && Number.isFinite(Number(value)) ? Number(value) : null;
      else if (name === "capo") song.capo = value && Number.isInteger(Number(value)) ? Number(value) : null;
      continue; // any other directive is metadata we don't display
    }
    if (current.type !== "tab" && /^\s*#/.test(rawLine)) continue; // source comment
    if (current.type === "tab") current.lines.push({ kind: "tab", text: rawLine });
    else if (rawLine.trim() === "") current.lines.push({ kind: "blank" });
    else current.lines.push({ kind: "lyrics", segments: parseLyrics(rawLine) });
  }

  // Trim blank lines at section edges, then drop sections left empty.
  for (const section of song.sections) {
    while (section.lines[0]?.kind === "blank") section.lines.shift();
    while (section.lines.at(-1)?.kind === "blank") section.lines.pop();
  }
  song.sections = song.sections.filter((s) => s.lines.length > 0);
  return song;
}

/** First chord in the song, used to guess the key when {key} is missing. */
export function firstChord(song: ChordProSong): string | null {
  for (const section of song.sections) {
    for (const line of section.lines) {
      if (line.kind !== "lyrics") continue;
      const chord = line.segments.find((s) => s.chord)?.chord;
      if (chord) return chord;
    }
  }
  return null;
}
