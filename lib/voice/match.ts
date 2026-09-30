import { normalizeWord } from "@/lib/script/parse";

// Follows a speaker through a script: given the words recognized so far and
// the last matched position, finds where in the script they are now. Speech
// recognition misses, merges and mishears words, so matching is fuzzy and
// only looks a little behind and a stretch ahead of the current position.

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Same word, allowing a shared prefix or one typo on longer words. */
export function similarWords(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return shorter >= 5 && editDistanceAtMostOne(a, b);
}

export type MatchOptions = { lookBehind?: number; lookAhead?: number; tail?: number };

/**
 * Index of the script word the speaker has just said, or null when the
 * recognized words don't line up with the script near `cursor`.
 */
export function matchPosition(
  script: string[],
  spoken: string[],
  cursor: number,
  { lookBehind = 8, lookAhead = 60, tail = 6 }: MatchOptions = {},
): number | null {
  const said = spoken.map(normalizeWord).filter(Boolean).slice(-tail);
  if (said.length === 0 || script.length === 0) return null;

  const from = Math.max(0, cursor - lookBehind);
  const to = Math.min(script.length - 1, cursor + lookAhead);
  let best: { index: number; score: number } | null = null;

  for (let end = from; end <= to; end++) {
    // The latest word said must be this script word…
    if (!similarWords(said[said.length - 1], script[end])) continue;
    // …then walk both backwards, tolerating a skipped or extra word.
    let score = 1;
    let i = said.length - 2;
    let k = end - 1;
    while (i >= 0 && k >= 0 && end - k <= tail * 2) {
      if (similarWords(said[i], script[k])) {
        score++;
        i--;
        k--;
      } else if (i > 0 && similarWords(said[i - 1], script[k])) {
        i--; // recognizer heard an extra word
      } else {
        k--; // speaker skipped a script word
      }
    }
    const closer = best && Math.abs(end - cursor) < Math.abs(best.index - cursor);
    if (!best || score > best.score || (score === best.score && closer)) best = { index: end, score };
  }

  if (!best) return null;
  // One matching word is only trusted when it is long and just ahead.
  if (best.score >= 2) return best.index;
  const word = script[best.index];
  return said.length === 1 && word.length >= 4 && best.index >= cursor && best.index <= cursor + 6 ? best.index : null;
}
