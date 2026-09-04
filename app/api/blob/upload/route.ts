import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isResponse, requireUserId } from "@/lib/api/require-user";

// Issues short-lived client upload tokens so the browser can PUT a PDF straight
// to Vercel Blob (bypassing the ~4.5 MB serverless request-body limit). The
// actual persistence of the returned URL happens client-side via a follow-up
// PATCH/POST to /api/documents — `onUploadCompleted` can't reach localhost.
export async function POST(req: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      // Passed explicitly: otherwise the SDK auto-resolves credentials and can
      // pick up VERCEL_OIDC_TOKEN from the env (scoped to the wrong context),
      // failing with "Access denied".
      token: process.env.BLOB_READ_WRITE_TOKEN,
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["application/pdf"],
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: userId,
      }),
      onUploadCompleted: async () => {
        // No-op: the client saves the blob URL onto the document itself.
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
