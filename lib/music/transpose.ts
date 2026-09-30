// Chord and key transposition. Spelling (♯ vs ♭) follows the target key, so
// moving a song in F up a tone gives G, and moving it to E♭ gives B♭ chords
// rather than A♯. Chords keep the accidental style they came in: ASCII (#/b)
// from ChordPro, Unicode (♯/♭) from the MusicXML parser.

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// Major keys (by pitch class) conventionally written with flats: F B♭ E♭ A♭ D♭.
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1]);

export type Accidentals = "sharps" | "flats";

const CHORD_RE = /^([A-G])([#b♯♭]?)(.*?)(?:\/([A-G])([#b♯♭]?))?$/;
const KEY_RE = /^\s*([A-G])([#b♯♭]?)\s*(m|min|minor|menor)?\s*$/i;

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function pitchClass(letter: string, accidental: string): number {
  const shift = accidental === "#" || accidental === "♯" ? 1 : accidental === "b" || accidental === "♭" ? -1 : 0;
  return mod12(NATURAL[letter] + shift);
}

function spell(pc: number, accidentals: Accidentals, unicode: boolean): string {
  const name = (accidentals === "flats" ? FLAT_NAMES : SHARP_NAMES)[pc];
  return unicode ? name.replace("#", "♯").replace("b", "♭") : name;
}

type ParsedKey = { pc: number; minor: boolean; spelled: Accidentals | null };

export function parseKey(key: string | null | undefined): ParsedKey | null {
  const m = key?.match(KEY_RE);
  if (!m) return null;
  const accidental = m[2];
  return {
    pc: pitchClass(m[1].toUpperCase(), accidental),
    minor: Boolean(m[3]),
    spelled: accidental === "#" || accidental === "♯" ? "sharps" : accidental ? "flats" : null,
  };
}

/** Sharps or flats for a key: by its relative major's conventional spelling. */
function accidentalsFor(pc: number, minor: boolean): Accidentals {
  return FLAT_MAJOR_KEYS.has(mod12(pc + (minor ? 3 : 0))) ? "flats" : "sharps";
}

/**
 * Accidentals to spell chords with after moving `key` by `semitones`. With no
 * key known, `fallbackChord` (usually the song's first chord) stands in.
 */
export function accidentalsForShift(
  key: string | null | undefined,
  semitones: number,
  fallbackChord?: string | null,
): Accidentals {
  // A chord stands in for its key: root + "m" when minor ("Am7" → Am, "Cmaj7" → C).
  const chordKey = fallbackChord?.match(/^([A-G][#b♯♭]?)(m(?!aj))?/);
  const parsed = parseKey(key) ?? (chordKey ? parseKey(chordKey[1] + (chordKey[2] ? "m" : "")) : null);
  if (!parsed) return "sharps";
  if (mod12(semitones) === 0 && parsed.spelled) return parsed.spelled;
  return accidentalsFor(parsed.pc + semitones, parsed.minor);
}

/** Moves a chord symbol by `semitones`, including a slash bass. */
export function transposeChord(chord: string, semitones: number, accidentals: Accidentals = "sharps"): string {
  if (mod12(semitones) === 0) return chord;
  const m = chord.trim().match(CHORD_RE);
  if (!m) return chord; // N.C., %, free text: left as written
  const unicode = /[♯♭]/.test(chord);
  const [, root, rootAcc, suffix, bass, bassAcc] = m;
  const out = spell(mod12(pitchClass(root, rootAcc) + semitones), accidentals, unicode) + suffix;
  return bass ? `${out}/${spell(mod12(pitchClass(bass, bassAcc) + semitones), accidentals, unicode)}` : out;
}

/** Moves a key name ("Bb", "F#m", "Dm") by `semitones`, keeping minor/major. */
export function transposeKey(key: string, semitones: number): string {
  const parsed = parseKey(key);
  if (!parsed) return key;
  if (mod12(semitones) === 0) return key.trim();
  const pc = mod12(parsed.pc + semitones);
  const unicode = /[♯♭]/.test(key);
  return spell(pc, accidentalsFor(pc, parsed.minor), unicode) + (parsed.minor ? "m" : "");
}

/** "+2", "−3", "0" — for the toolbar. */
export function formatShift(semitones: number): string {
  if (semitones === 0) return "0";
  return semitones > 0 ? `+${semitones}` : `−${Math.abs(semitones)}`;
}

/** Key name from a MusicXML <fifths> count and <mode>. */
export function keyFromFifths(fifths: number, mode: string | null): string | null {
  if (!Number.isInteger(fifths) || fifths < -7 || fifths > 7) return null;
  const majors = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  const minors = ["Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#"];
  const minor = mode === "minor";
  const name = (minor ? minors : majors).at(fifths + 7);
  return name ? name + (minor ? "m" : "") : null;
}
