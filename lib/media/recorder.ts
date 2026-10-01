// Recording helpers: which container/codec the browser can record (Chrome
// and Firefox do WebM, Safari MP4) and how to name the downloaded file.

const CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

/** First recordable type, or null if MediaRecorder supports none of them. */
export function pickMimeType(isSupported: (type: string) => boolean): string | null {
  return CANDIDATES.find((type) => isSupported(type)) ?? null;
}

export function extensionFor(mimeType: string): "webm" | "mp4" {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/** "discurso-de-apertura-2026-09-30-1415.webm" */
export function recordingFileName(title: string, date: Date, extension: string): string {
  const slug =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "grabacion";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${slug}-${stamp}.${extension}`;
}
