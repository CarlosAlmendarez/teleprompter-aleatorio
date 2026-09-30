// Bluetooth page-turner pedals present themselves as keyboards (usually
// PageUp/PageDown or arrow keys). The mapping key → action is per device, so
// it lives in localStorage, not in the user's account.

export type PedalAction = "forward" | "back" | "toggle" | "next" | "prev";

export const PEDAL_ACTIONS: PedalAction[] = ["forward", "back", "toggle", "next", "prev"];

export const PEDAL_ACTION_LABEL: Record<PedalAction, string> = {
  forward: "Avanzar",
  back: "Retroceder",
  toggle: "Play / pausa",
  next: "Siguiente del setlist",
  prev: "Anterior del setlist",
};

export type PedalBindings = Partial<Record<PedalAction, string>>;
export type PedalConfig = { enabled: boolean; bindings: PedalBindings };

export const PEDAL_PRESETS: Array<{ id: string; label: string; bindings: PedalBindings }> = [
  { id: "page", label: "AvPág / RePág", bindings: { forward: "PageDown", back: "PageUp" } },
  { id: "arrows-v", label: "Flechas ↓ / ↑", bindings: { forward: "ArrowDown", back: "ArrowUp" } },
  { id: "arrows-h", label: "Flechas → / ←", bindings: { forward: "ArrowRight", back: "ArrowLeft" } },
];

export const DEFAULT_PEDAL_CONFIG: PedalConfig = { enabled: false, bindings: PEDAL_PRESETS[0].bindings };

const STORAGE_KEY = "pedal:config";
const CHANGE_EVENT = "pedal-config-change";

export function loadPedalConfig(): PedalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PEDAL_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PedalConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      bindings: typeof parsed.bindings === "object" && parsed.bindings ? parsed.bindings : {},
    };
  } catch {
    return DEFAULT_PEDAL_CONFIG;
  }
}

export function savePedalConfig(config: PedalConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePedalConfig(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The action a key triggers, or null. Each key maps to at most one action. */
export function actionForKey(bindings: PedalBindings, code: string): PedalAction | null {
  return PEDAL_ACTIONS.find((action) => bindings[action] === code) ?? null;
}

/** Assigns `code` to `action`, removing it from any other action first. */
export function bindKey(bindings: PedalBindings, action: PedalAction, code: string): PedalBindings {
  const next: PedalBindings = {};
  for (const a of PEDAL_ACTIONS) {
    if (a !== action && bindings[a] && bindings[a] !== code) next[a] = bindings[a];
  }
  next[action] = code;
  return next;
}

const KEY_LABEL: Record<string, string> = {
  PageDown: "AvPág",
  PageUp: "RePág",
  ArrowDown: "↓",
  ArrowUp: "↑",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "Espacio",
  Enter: "Intro",
  NumpadEnter: "Intro",
  Home: "Inicio",
  End: "Fin",
};

export function keyLabel(code: string | undefined): string {
  if (!code) return "—";
  if (KEY_LABEL[code]) return KEY_LABEL[code];
  const key = code.match(/^Key([A-Z])$/)?.[1] ?? code.match(/^Digit(\d)$/)?.[1];
  return key ?? code;
}
