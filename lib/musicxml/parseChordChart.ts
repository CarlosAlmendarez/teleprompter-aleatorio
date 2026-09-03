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
};

export type ChordChart = {
  title: string | null;
  tempo: number | null;
  beats: number | null;
  beatType: number | null;
  keyMode: string | null;
  measures: ChordChartMeasure[];
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

export function parseChordChart(xml: string): ChordChart {
  const title = firstMatch(xml, /<work-title>\s*([\s\S]*?)\s*<\/work-title>/);
  const tempo = firstMatch(xml, /<per-minute>\s*(\d+)\s*<\/per-minute>/);
  const beats = firstMatch(xml, /<beats>\s*(\d+)\s*<\/beats>/);
  const beatType = firstMatch(xml, /<beat-type>\s*(\d+)\s*<\/beat-type>/);
  const keyMode = firstMatch(xml, /<mode>\s*([\w-]+)\s*<\/mode>/);

  const measures: ChordChartMeasure[] = [];
  const measureRe = /<measure\b[^>]*\bnumber="([^"]*)"[^>]*>([\s\S]*?)<\/measure>/g;
  let measureMatch: RegExpExecArray | null;
  while ((measureMatch = measureRe.exec(xml))) {
    const [, number, body] = measureMatch;
    const chords: string[] = [];
    const harmonyRe = /<harmony\b[^>]*>([\s\S]*?)<\/harmony>/g;
    let harmonyMatch: RegExpExecArray | null;
    while ((harmonyMatch = harmonyRe.exec(body))) {
      const symbol = chordSymbol(harmonyMatch[1]);
      if (symbol) chords.push(symbol);
    }
    measures.push({ number, chords });
  }

  return {
    title,
    tempo: tempo ? Number(tempo) : null,
    beats: beats ? Number(beats) : null,
    beatType: beatType ? Number(beatType) : null,
    keyMode,
    measures,
  };
}
