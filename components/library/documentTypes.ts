import type { DocumentType } from "@/lib/types";

export const TYPE_LABEL: Record<DocumentType, string> = {
  text: "Texto",
  chordpro: "ChordPro",
  pdf: "PDF",
  musicxml: "MusicXML",
};

export const TYPE_STYLE: Record<DocumentType, { icon: string; tint: string }> = {
  text: { icon: "📜", tint: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  chordpro: { icon: "🎸", tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  musicxml: { icon: "🎼", tint: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  pdf: { icon: "📄", tint: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};
