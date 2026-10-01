// Lightweight regex-based extractor for the parts of MusicXML we actually
// display (title, tempo, time signature, and the chord-symbol timeline).
// Deliberately avoids a full XML DOM/parser dependency — this only ever
// needs to read a handful of flat leaf elements, and running as plain
// string matching means it works in a Server Component with no client JS.

import { keyFromFifths } from "@/lib/music/transpose";

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
  /** Position of this measure in the written score (0-based). */
  index: number;
  /** Times this measure was already played before this entry: 0 the first time, 1 on the repeat… */
  pass: number;
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
  /** Key name ("Bb", "Em") from the first <fifths>/<mode>, for transposition. */
  key: string | null;
  /** Measures in playing order: repeats, voltas and D.C./D.S. jumps unrolled. */
  measures: ChordChartMeasure[];
  /** Each written measure once, in score order (timing ignores repeats). */
  written: ChordChartMeasure[];
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

/** Navigation marks on a measure that change the playing order. */
export type MeasureFlags = {
  forward: boolean;
  /** Total times the repeated section is played (backward repeat), or null. */
  backward: number | null;
  /** Volta numbers starting on this measure ("1, 2" → [1, 2]), or null. */
  endingStart: number[] | null;
  endingStop: boolean;
  segno: boolean;
  coda: boolean;
  toCoda: boolean;
  daCapo: boolean;
  dalSegno: boolean;
  fine: boolean;
};

function readFlags(text: string): MeasureFlags {
  const backwardTag = text.match(/<repeat\b[^>]*direction="backward"[^>]*>/)?.[0];
  let endingStart: number[] | null = null;
  let endingStop = false;
  for (const tag of text.match(/<ending\b[^>]*>/g) ?? []) {
    const type = tag.match(/\btype="([^"]+)"/)?.[1];
    if (type === "start") {
      const numbers = (tag.match(/\bnumber="([^"]+)"/)?.[1] ?? "")
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);
      endingStart = numbers.length > 0 ? numbers : [1];
    } else if (type === "stop" || type === "discontinue") {
      endingStop = true;
    }
  }
  return {
    forward: /<repeat\b[^>]*direction="forward"/.test(text),
    backward: backwardTag ? Number(backwardTag.match(/\btimes="(\d+)"/)?.[1] ?? 2) : null,
    endingStart,
    endingStop,
    segno: /<segno\b/.test(text) || /<sound\b[^>]*\bsegno="/.test(text),
    coda: /<coda\b/.test(text) || /<sound\b[^>]*\bcoda="/.test(text),
    toCoda: /<sound\b[^>]*\btocoda="/.test(text),
    daCapo: /<sound\b[^>]*\bdacapo="yes"/.test(text),
    dalSegno: /<sound\b[^>]*\bdalsegno="/.test(text),
    fine: /<sound\b[^>]*\bfine="/.test(text),
  };
}

/**
 * Unrolls repeats into playing order: backward repeats (with `times`),
 * first/second endings, D.C./D.S. al Fine / al Coda. After a D.C./D.S. jump
 * repeats are not taken again and endings that lead back are skipped, as is
 * customary. Returns written-measure indices in the order they are played.
 */
export function playingOrder(flags: MeasureFlags[]): number[] {
  const n = flags.length;
  const order: number[] = [];
  const limit = n * 8 + 64; // guard against malformed marks looping forever
  const repeatsDone = new Map<number, number>();
  let i = 0;
  let sectionStart = 0;
  let pass = 1;
  let jumped = false;

  const endingEnd = (from: number) => {
    for (let j = from; j < n; j++) if (flags[j].endingStop) return j;
    return from;
  };

  while (i < n && order.length < limit) {
    const f = flags[i];
    if (f.forward) sectionStart = i;

    if (f.endingStart) {
      const stop = endingEnd(i);
      const skip = jumped ? flags[stop].backward !== null : !f.endingStart.includes(pass);
      if (skip) {
        i = stop + 1;
        continue;
      }
    }

    order.push(i);

    if (jumped && f.fine) break;
    if (jumped && f.toCoda) {
      const target = flags.findIndex((g, k) => k > i && g.coda);
      if (target >= 0) {
        i = target;
        continue;
      }
    }

    if (f.backward !== null) {
      const done = repeatsDone.get(i) ?? 1;
      if (!jumped && done < f.backward) {
        repeatsDone.set(i, done + 1);
        pass = done + 1;
        i = sectionStart;
        continue;
      }
      pass = 1;
      sectionStart = i + 1;
    }

    if (!jumped && (f.daCapo || f.dalSegno)) {
      jumped = true;
      pass = 1;
      const segno = flags.findIndex((g) => g.segno);
      i = f.daCapo || segno < 0 ? 0 : segno;
      sectionStart = i;
      continue;
    }
    i++;
  }
  return order;
}

const MEASURE_RE = /<measure\b[^>]*\bnumber="([^"]*)"[^>]*>([\s\S]*?)<\/measure>/g;

/** Each <part>'s measures; a fragment without parts counts as one part. */
function partsOf(xml: string): Array<Array<{ number: string; body: string }>> {
  const bodies = [...xml.matchAll(/<part(?:\s[^>]*)?>([\s\S]*?)<\/part>/g)].map((m) => m[1]);
  return (bodies.length > 0 ? bodies : [xml]).map((body) =>
    [...body.matchAll(MEASURE_RE)].map((m) => ({ number: m[1], body: m[2] })),
  );
}

export function parseChordChart(xml: string): ChordChart {
  const title = firstMatch(xml, /<work-title>\s*([\s\S]*?)\s*<\/work-title>/);
  const initialTempo = firstMatch(xml, /<per-minute>\s*(\d+(?:\.\d+)?)\s*<\/per-minute>/);
  const initialBeats = firstMatch(xml, /<beats>\s*(\d+)\s*<\/beats>/);
  const initialBeatType = firstMatch(xml, /<beat-type>\s*(\d+)\s*<\/beat-type>/);
  const keyMode = firstMatch(xml, /<mode>\s*([\w-]+)\s*<\/mode>/);
  const fifths = firstMatch(xml, /<fifths>\s*(-?\d+)\s*<\/fifths>/);

  // Multi-instrument scores repeat every measure once per part. Chords come
  // from the part that carries them; tempo, meter and navigation marks are
  // often written on only one part, so they are read from all parts.
  const parts = partsOf(xml);
  const harmonyCount = parts.map((part) =>
    part.reduce((n, m) => n + (m.body.match(/<harmony\b/g)?.length ?? 0), 0),
  );
  const chordPart = parts[harmonyCount.indexOf(Math.max(...harmonyCount))] ?? [];

  const written: ChordChartMeasure[] = [];
  const flags: MeasureFlags[] = [];
  let tempo = initialTempo ? Number(initialTempo) : DEFAULT_TEMPO;
  let beats = initialBeats ? Number(initialBeats) : DEFAULT_BEATS;
  let beatType = initialBeatType ? Number(initialBeatType) : DEFAULT_BEAT_TYPE;
  let cursorSec = 0;

  chordPart.forEach(({ number, body }, index) => {
    const allParts = parts.map((part) => part[index]?.body ?? "").join("\n");

    // Tempo/time-signature changes apply from this measure forward.
    const measureTempo =
      firstMatch(allParts, /<sound[^>]*\btempo="([\d.]+)"/) ??
      firstMatch(allParts, /<per-minute>\s*(\d+(?:\.\d+)?)\s*<\/per-minute>/);
    if (measureTempo) tempo = Number(measureTempo);
    const measureBeats = firstMatch(allParts, /<beats>\s*(\d+)\s*<\/beats>/);
    if (measureBeats) beats = Number(measureBeats);
    const measureBeatType = firstMatch(allParts, /<beat-type>\s*(\d+)\s*<\/beat-type>/);
    if (measureBeatType) beatType = Number(measureBeatType);

    const chords: string[] = [];
    for (const harmony of body.matchAll(/<harmony\b[^>]*>([\s\S]*?)<\/harmony>/g)) {
      const symbol = chordSymbol(harmony[1]);
      if (symbol) chords.push(symbol);
    }

    const durationSec = beats * (4 / beatType) * (60 / tempo);
    written.push({ number, index, pass: 0, chords, tempo, beats, beatType, startSec: cursorSec, durationSec });
    flags.push(readFlags(allParts));
    cursorSec += durationSec;
  });

  const passes = new Map<number, number>();
  let playSec = 0;
  const measures = playingOrder(flags).map((index) => {
    const pass = passes.get(index) ?? 0;
    passes.set(index, pass + 1);
    const entry = { ...written[index], pass, startSec: playSec };
    playSec += entry.durationSec;
    return entry;
  });

  return {
    title,
    tempo: initialTempo ? Number(initialTempo) : null,
    beats: initialBeats ? Number(initialBeats) : null,
    beatType: initialBeatType ? Number(initialBeatType) : null,
    keyMode,
    key: fifths !== null ? keyFromFifths(Number(fifths), keyMode) : null,
    measures,
    written,
    totalDurationSec: playSec,
  };
}
