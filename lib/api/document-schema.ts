import { z } from "zod";

// Shared request-body schemas for the documents API. Kept in one place so the
// collection route (POST) and the item route (PATCH) never drift apart.

const pdfAnchorSchema = z.object({
  page: z.number().int().positive(),
  measure: z.number().int().positive(),
});

const pdfAttachmentSchema = z.object({
  url: z.url(),
  pageCount: z.number().int().positive().optional(),
  anchors: z.array(pdfAnchorSchema).max(200).optional(),
});

export const metadataSchema = z
  .object({
    key: z.string().max(20).optional(),
    tempo: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    durationSec: z.number().int().positive().optional(),
    lyrics: z.string().max(200_000).optional(),
    pdf: pdfAttachmentSchema.optional(),
  })
  .partial();

export const createDocumentSchema = z.object({
  type: z.enum(["pdf", "musicxml", "text", "chordpro"]),
  title: z.string().trim().min(1).max(200),
  folderId: z.uuid().nullable().optional(),
  content: z.string().max(500_000).nullable().optional(),
  blobUrl: z.url().nullable().optional(),
  metadata: metadataSchema.optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  folderId: z.uuid().nullable().optional(),
  content: z.string().max(500_000).nullable().optional(),
  blobUrl: z.url().nullable().optional(),
  metadata: metadataSchema.optional(),
});
