export type DocumentType = "pdf" | "musicxml" | "text" | "chordpro";

export type DocumentRow = {
  id: string;
  ownerId: string;
  folderId: string | null;
  type: DocumentType;
  title: string;
  content: string | null;
  blobUrl: string | null;
  metadata: {
    key?: string;
    tempo?: number;
    notes?: string;
    durationSec?: number;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type FolderRow = {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
};
