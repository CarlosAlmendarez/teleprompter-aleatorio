import { z } from "zod";
import { isBlobUrl } from "@/lib/blob/url";

// Shared request-body schemas for the documents API. Kept in one place so the
// collection route (POST) and the item route (PATCH) never drift apart.

const pdfAnchorSchema = z.object({
  page: z.number().int().positive(),
  measure: z.number().int().positive(),
});

// PDFs are only ever uploaded to our Vercel Blob store; rejecting other hosts
// keeps pdf.js from being pointed at arbitrary URLs and scopes blob cleanup.
const blobUrlSchema = z.url().refine(isBlobUrl, "Must be a Vercel Blob URL");

const pdfAttachmentSchema = z.object({
  url: blobUrlSchema,
  pageCount: z.number().int().positive().optional(),
  anchors: z.array(pdfAnchorSchema).max(200).optional(),
});

const transposeSchema = z.number().int().min(-11).max(11);
const capoSchema = z.number().int().min(0).max(11);

export const playbackSchema = z
  .object({
    speed: z.number().min(5).max(200),
    fontSize: z.number().min(12).max(120),
    mirror: z.boolean(),
    position: z.number().min(0).max(1),
    tempoPct: z.number().min(50).max(150),
  })
  .partial();

export const setlistOverridesSchema = z
  .object({
    speed: z.number().min(5).max(200),
    fontSize: z.number().min(12).max(120),
    mirror: z.boolean(),
    showLyrics: z.boolean(),
    tempoPct: z.number().min(50).max(150),
    transpose: transposeSchema,
    capo: capoSchema,
    transitionNote: z.string().max(300),
  })
  .partial();

/** PATCH body for one setlist step: listed keys are merged, `null` removes. */
export const setlistOverridesPatchSchema = z
  .object({
    speed: z.number().min(5).max(200).nullable(),
    fontSize: z.number().min(12).max(120).nullable(),
    mirror: z.boolean().nullable(),
    showLyrics: z.boolean().nullable(),
    tempoPct: z.number().min(50).max(150).nullable(),
    transpose: transposeSchema.nullable(),
    capo: capoSchema.nullable(),
    transitionNote: z.string().max(300).nullable(),
  })
  .partial()
  .strict();

export const metadataSchema = z
  .object({
    key: z.string().max(20).optional(),
    tempo: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    durationSec: z.number().int().positive().optional(),
    lyrics: z.string().max(200_000).optional(),
    pdf: pdfAttachmentSchema.optional(),
    transpose: transposeSchema.optional(),
    capo: capoSchema.optional(),
    playback: playbackSchema.optional(),
  })
  .partial();

// PATCH sends only the metadata keys it changes; the route shallow-merges them
// into the stored object so independent editors on the same page (lyrics, PDF)
// can't overwrite each other. `null` removes a key.
export const metadataPatchSchema = z
  .object({
    key: z.string().max(20).nullable(),
    tempo: z.number().int().positive().nullable(),
    notes: z.string().max(2000).nullable(),
    durationSec: z.number().int().positive().nullable(),
    lyrics: z.string().max(200_000).nullable(),
    pdf: pdfAttachmentSchema.nullable(),
    transpose: transposeSchema.nullable(),
    capo: capoSchema.nullable(),
    playback: playbackSchema.nullable(),
  })
  .partial();

export const createDocumentSchema = z.object({
  type: z.enum(["pdf", "musicxml", "text", "chordpro"]),
  title: z.string().trim().min(1).max(200),
  folderId: z.uuid().nullable().optional(),
  content: z.string().max(500_000).nullable().optional(),
  blobUrl: blobUrlSchema.nullable().optional(),
  metadata: metadataSchema.optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  folderId: z.uuid().nullable().optional(),
  content: z.string().max(500_000).nullable().optional(),
  blobUrl: blobUrlSchema.nullable().optional(),
  metadata: metadataPatchSchema.optional(),
});
