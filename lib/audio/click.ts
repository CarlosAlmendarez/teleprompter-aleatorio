// Metronome clicks with Web Audio: short sine blips scheduled on the audio
// clock, so the count-in stays in time even if the main thread is busy.

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * Schedules `count` clicks `intervalSec` apart, the first one accented.
 * Returns a cancel function that silences clicks not yet played.
 */
export function scheduleClicks(count: number, intervalSec: number): () => void {
  const ctx = audioContext();
  if (!ctx) return () => {};
  const start = ctx.currentTime + 0.05;
  const nodes: OscillatorNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * intervalSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = i === 0 ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.8 : 0.5, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
    nodes.push(osc);
  }
  return () => {
    for (const osc of nodes) {
      try {
        osc.stop();
      } catch {
        // already finished
      }
    }
  };
}
