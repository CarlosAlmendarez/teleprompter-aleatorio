import type { DocumentType } from "@/lib/types";

export type SetlistKind = "music_set" | "script_sequence";

export const SETLIST_KIND_LABEL: Record<SetlistKind, string> = {
  music_set: "Repertorio musical",
  script_sequence: "Secuencia de guiones",
};

export type SetlistSummary = {
  id: string;
  name: string;
  kind: SetlistKind;
  itemCount: number;
  updatedAt: string;
};

export type SetlistItemRow = {
  id: string;
  documentId: string;
  position: number;
  title: string;
  type: DocumentType;
};

export type SetlistDetail = Omit<SetlistSummary, "itemCount"> & { items: SetlistItemRow[] };

/** Prev/next context passed to an immersive player during setlist playback. */
export type SetlistNav = {
  name: string;
  index: number;
  total: number;
  backHref: string;
  prev: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
};

/** Immersive player route for a document, carrying setlist context if given. */
export function playerHref(
  doc: { id: string; type: DocumentType },
  setlist?: { id: string; index: number },
): string {
  const base =
    doc.type === "musicxml"
      ? `/scores/${doc.id}`
      : doc.type === "pdf"
        ? `/pdf/${doc.id}`
        : `/prompter/${doc.id}`;
  return setlist ? `${base}?setlist=${setlist.id}&i=${setlist.index}` : base;
}
