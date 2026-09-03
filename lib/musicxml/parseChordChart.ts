// Lightweight regex-based extractor for the parts of MusicXML we actually
// display (title, tempo, time signature, and the chord-symbol timeline).
// Deliberately avoids a full XML DOM/parser dependency — this only ever
// needs to read a handful of flat leaf elements, and running as plain
// string matching means it works in a Server Component with no client JS.

const KIND_SYMBOL: Record<string, string> = {
  major: "",
  minor: "m",
  augmented: "aug",
  diminished: "dim",
  dominant: "7",
  "major-seventh": "maj7",
  "minor-seventh": "m7",
  "diminished-seventh": "dim7",
  "augmented-seventh": "aug7",
  "half-diminished": "m7b5",
  "major-minor": "mMaj7",
  "major-sixth": "6",
  "minor-sixth": "m6",
  "dominant-ninth": "9",
  "major-ninth": "maj9",
  "minor-ninth": "m9",
  "dominant-11th": "11",
  "major-11th": "maj11",
  "minor-11th": "m11",
  "dominant-13th": "13",
  "major-13th": "maj13",
  "minor-13th": "m13",
  "suspended-second": "sus2",
  "suspended-fourth": "sus4",
  power: "5",
  none: "N.C.",
};

const ALTER_SYMBOL: Record<string, string> = {
  "2": "𝄪",
  "1": "♯",
  "-1": "♭",
  "-2": "𝄫",
};

export type ChordChartMeasure = {
  number: string;
  chords: string[];
  /** Tempo (quarter notes per minute) in effect during this measure. */
  tempo: number;
  beats: number;
  beatType: number;
  /** Seconds from the start of the song to the start of this measure. */
  startSec: number;
  durationSec: number;
};

export type ChordChart = {
  title: string | null;
  tempo: number | null;
  beats: number | null;
  beatType: number | null;
  keyMode: string | null;
  measures: ChordChartMeasure[];
  totalDurationSec: number;
};

function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match ? match[1] : null;
}

function chordSymbol(harmonyXml: string): string | null {
  const step = firstMatch(harmonyXml, /<root-step>\s*([A-G])\s*<\/root-step>/);
  if (!step) return null;
  const alter = firstMatch(harmonyXml, /<root-alter>\s*(-?\d+)\s*<\/root-alter>/);
  const kindText = firstMatch(harmonyXml, /<kind[^>]*\btext="([^"]*)"/);
  const kindWord = firstMatch(harmonyXml, /<kind[^>]*>([\w-]+)<\/kind>/);

  const suffix =
    kindText !== null
      ? kindText
      : kindWord
        ? (KIND_SYMBOL[kindWord] ?? kindWord)
        : "";

  return `${step}${alter ? (ALTER_SYMBOL[alter] ?? "") : ""}${suffix}`;
}

const DEFAULT_TEMPO = 120;
const DEFAULT_BEATS = 4;
const DEFAULT_BEAT_TYPE = 4;

export function parseChordChart(xml: string): ChordChart {
  const title = firstMatch(xml, /<work-title>\s*([\s\S]*?)\s*<\/work-title>/);
  const initialTempo = firstMatch(xml, /<per-minute>\s*(\d+(?:\.\d+)?)\s*<\/per-minute>/);
  const initialBeats = firstMatch(xml, /<beats>\s*(\d+)\s*<\/beats>/);
  const initialBeatType = firstMatch(xml, /<beat-type>\s*(\d+)\s*<\/beat-type>/);
  const keyMode = firstMatch(xml, /<mode>\s*([\w-]+)\s*<\/mode>/);

  const measures: ChordChartMeasure[] = [];
  let tempo = initialTempo ? Number(initialTempo) : DEFAULT_TEMPO;
  let beats = initialBeats ? Number(initialBeats) : DEFAULT_BEATS;
  let beatType = initialBeatType ? Number(initialBeatType) : DEFAULT_BEAT_TYPE;
  let cursorSec = 0;

  const measureRe = /<measure\b[^>]*\bnumber="([^"]*)"[^>]*>([\s\S]*?)<\/measure>/g;
  let measureMatch: RegExpExecArray | null;
  while ((measureMatch = measureRe.exec(xml))) {
    const [, number, body] = measureMatch;

    // Tempo/time-signature changes apply from this measure forward.
    const measureTempo =
      firstMatch(body, /<sound[^>]*\btempo="([\d.]+)"/) ??
      firstMatch(body, /<per-minute>\s*(\d+(?:\.\d+)?)\s*<\/per-minute>/);
    if (measureTempo) tempo = Number(measureTempo);
    const measureBeats = firstMatch(body, /<beats>\s*(\d+)\s*<\/beats>/);
    if (measureBeats) beats = Number(measureBeats);
    const measureBeatType = firstMatch(body, /<beat-type>\s*(\d+)\s*<\/beat-type>/);
    if (measureBeatType) beatType = Number(measureBeatType);

    const chords: string[] = [];
    const harmonyRe = /<harmony\b[^>]*>([\s\S]*?)<\/harmony>/g;
    let harmonyMatch: RegExpExecArray | null;
    while ((harmonyMatch = harmonyRe.exec(body))) {
      const symbol = chordSymbol(harmonyMatch[1]);
      if (symbol) chords.push(symbol);
    }

    const secondsPerQuarter = 60 / tempo;
    const durationSec = beats * (4 / beatType) * secondsPerQuarter;
    const startSec = cursorSec;
    cursorSec += durationSec;

    measures.push({ number, chords, tempo, beats, beatType, startSec, durationSec });
  }

  return {
    title,
    tempo: initialTempo ? Number(initialTempo) : null,
    beats: initialBeats ? Number(initialBeats) : null,
    beatType: initialBeatType ? Number(initialBeatType) : null,
    keyMode,
    measures,
    totalDurationSec: cursorSec,
  };
}
