import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { matchPosition } from "@/lib/voice/match";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupported(): boolean {
  return recognitionCtor() !== null;
}

const noSubscribe = () => () => {};

/** Voice support as render state: false on the server and during hydration. */
export function useVoiceSupported(): boolean {
  return useSyncExternalStore(noSubscribe, voiceSupported, () => false);
}

export type VoiceError = "permission" | "microphone" | "network" | "unsupported" | null;

const KEEP_WORDS = 30;

/**
 * Follows the speaker through `words` (the script's normalized spoken
 * words): recognition runs continuously and each result is aligned to the
 * script near the last match; `onWord` gets the index of the word just said.
 * Chrome stops listening after a pause, so it is restarted while active.
 */
export function useVoiceScroll({
  words,
  onWord,
  lang,
}: {
  words: string[];
  onWord: (index: number) => void;
  lang: string;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<VoiceError>(null);
  const recRef = useRef<Recognition | null>(null);
  const activeRef = useRef(false);
  const cursorRef = useRef(0);
  const heardRef = useRef<string[]>([]);
  const onWordRef = useRef(onWord);
  const wordsRef = useRef(words);
  useEffect(() => {
    onWordRef.current = onWord;
    wordsRef.current = words;
  });

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    recRef.current?.abort();
    recRef.current = null;
  }, []);

  const start = useCallback(
    (fromWord: number) => {
      const Ctor = recognitionCtor();
      if (!Ctor) {
        setError("unsupported");
        return;
      }
      recRef.current?.abort();
      cursorRef.current = Math.max(0, fromWord);
      heardRef.current = [];
      setError(null);

      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            heardRef.current = [...heardRef.current, ...result[0].transcript.split(/\s+/)].slice(-KEEP_WORDS);
          } else {
            interim += ` ${result[0].transcript}`;
          }
        }
        const spoken = [...heardRef.current, ...interim.split(/\s+/)].filter(Boolean);
        const index = matchPosition(wordsRef.current, spoken, cursorRef.current);
        if (index !== null && index !== cursorRef.current) {
          cursorRef.current = index;
          onWordRef.current(index);
        }
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("permission");
          stop();
        } else if (e.error === "audio-capture") {
          setError("microphone");
          stop();
        } else if (e.error === "network") {
          setError("network");
        }
      };
      rec.onend = () => {
        if (activeRef.current && recRef.current === rec) {
          setTimeout(() => {
            if (activeRef.current && recRef.current === rec) {
              try {
                rec.start();
              } catch {}
            }
          }, 150);
        }
      };
      recRef.current = rec;
      activeRef.current = true;
      setActive(true);
      try {
        rec.start();
      } catch {
        stop();
      }
    },
    [lang, stop],
  );

  useEffect(() => stop, [stop]);

  return { active, error, start, stop };
}
