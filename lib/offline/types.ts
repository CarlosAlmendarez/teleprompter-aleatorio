export type OfflineTarget = { documentId: string } | { setlistId: string };

export type OfflineManifest = {
  /** Same-origin pages to keep a copy of, with a label for the offline page. */
  pages: Array<{ url: string; title: string }>;
  /** Blob-hosted PDFs those pages display. */
  pdfs: string[];
};
