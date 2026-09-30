// The teleprompter's control layer: every action — keyboard, pedal, toolbar,
// or the operator's window — is one of these commands, applied in one place.

export type PrompterMode = "auto" | "manual";

export type PrompterCommand =
  | { type: "toggle" }
  | { type: "reset" }
  | { type: "scrollBy"; screens: number }
  | { type: "nudge"; px: number }
  | { type: "scrollToFraction"; value: number }
  | { type: "jumpTo"; anchor: string }
  | { type: "setSpeed"; value: number }
  | { type: "nudgeSpeed"; delta: number }
  | { type: "setFontSize"; value: number }
  | { type: "setMirror"; value: boolean }
  | { type: "setMode"; value: PrompterMode }
  | { type: "setTranspose"; transpose: number; capo: number };

/** What the reader window reports back to the operator. */
export type PrompterSnapshot = {
  playing: boolean;
  counting: boolean;
  mode: PrompterMode;
  speed: number;
  fontSize: number;
  mirror: boolean;
  position: number;
  remainingSec: number | null;
  transpose: number;
  capo: number;
};
