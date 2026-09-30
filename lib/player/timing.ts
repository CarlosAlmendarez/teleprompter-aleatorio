/** "1:05", "12:40", "1:02:03". Negative values keep their sign. */
export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "−" : "";
  const s = Math.round(Math.abs(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, "0")}:${sec}` : `${sign}${m}:${sec}`;
}

/** Seconds left at the current speed, or null when not moving. */
export function remainingSeconds(position: number, scrollMaxPx: number, speedPxPerSec: number): number | null {
  if (speedPxPerSec <= 0 || scrollMaxPx <= 0) return null;
  return ((1 - Math.min(1, Math.max(0, position))) * scrollMaxPx) / speedPxPerSec;
}

/**
 * How far ahead (+) or behind (−) of a target duration the reader is, in
 * seconds: where they are versus where an even pace would have them by now.
 */
export function paceDelta(position: number, elapsedSec: number, targetSec: number): number {
  if (targetSec <= 0) return 0;
  const expected = Math.min(1, elapsedSec / targetSec);
  return (position - expected) * targetSec;
}

/** Parses "3:40", "1:02:03" or "90" into seconds; null if invalid. */
export function parseClock(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const seconds = parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  return seconds > 0 ? seconds : null;
}
