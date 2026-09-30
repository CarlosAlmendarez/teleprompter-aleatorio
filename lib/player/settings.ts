import type { DocumentMetadata, PlaybackSettings, SetlistItemOverrides } from "@/lib/db/schema";

/** Everything a player remembers between sessions. */
export type PlayerSettings = PlaybackSettings & { transpose?: number; capo?: number };

/**
 * Effective settings: the document's own, overridden by the setlist step's
 * while a setlist plays. Inside a setlist playback always starts from the top.
 */
export function resolvePlayerSettings(
  metadata: DocumentMetadata | null | undefined,
  overrides: SetlistItemOverrides | null | undefined,
): PlayerSettings {
  const fromDoc: PlayerSettings = {
    ...(metadata?.playback ?? {}),
    ...(metadata?.transpose !== undefined ? { transpose: metadata.transpose } : {}),
    ...(metadata?.capo !== undefined ? { capo: metadata.capo } : {}),
  };
  if (!overrides) return fromDoc;
  const { position: _ignored, ...rest } = fromDoc;
  void _ignored;
  const picked: PlayerSettings = {};
  for (const key of ["speed", "fontSize", "mirror", "tempoPct", "transpose", "capo"] as const) {
    if (overrides[key] !== undefined) Object.assign(picked, { [key]: overrides[key] });
  }
  return { ...rest, ...picked };
}

/** Splits a settings change into the document metadata PATCH body. */
export function toMetadataPatch(
  change: PlayerSettings,
  currentPlayback: PlaybackSettings,
): { patch: Partial<DocumentMetadata>; playback: PlaybackSettings } {
  const { transpose, capo, ...playbackChange } = change;
  const playback = { ...currentPlayback, ...playbackChange };
  const patch: Partial<DocumentMetadata> = {};
  if (Object.keys(playbackChange).length > 0) patch.playback = playback;
  if (transpose !== undefined) patch.transpose = transpose;
  if (capo !== undefined) patch.capo = capo;
  return { patch, playback };
}

/** A settings change as setlist-step overrides (position is never kept there). */
export function toOverridesPatch(change: PlayerSettings): SetlistItemOverrides {
  const { position: _ignored, ...rest } = change;
  void _ignored;
  return rest;
}
