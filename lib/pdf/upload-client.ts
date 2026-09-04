"use client";

import { upload } from "@vercel/blob/client";

/**
 * Uploads a PDF straight from the browser to Vercel Blob using a short-lived
 * token minted by `/api/blob/upload`, and returns the public blob URL. Callers
 * persist that URL onto the document themselves.
 */
export async function uploadPdf(file: File): Promise<string> {
  const result = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: "application/pdf",
  });
  return result.url;
}
