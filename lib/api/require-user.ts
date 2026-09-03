import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Resolves the current session's user id, or a 401 response to return as-is. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
