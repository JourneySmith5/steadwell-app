import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/dal";

// Not a page — same reasoning as /api/statements/[id]/download: Route
// Handlers aren't covered by the portal layout's auth checks, so this
// checks who's asking itself (see AGENTS.md / earlier DAL comments).
//
// This exists because a plain multipart <form action={serverAction}>
// upload routes the whole file through our own serverless function,
// which Next.js/Vercel cap well below what a real batch of scanned bank
// statements needs (see next.config.ts) — a client trying to upload
// several files at once got a hard, generic "this page couldn't load"
// failure with no useful error. This route only ever exchanges a short
// -lived, scoped upload token; the file bytes go straight from the
// browser to Blob storage and never pass through this function at all,
// so there's no body-size limit to hit.
//
// Statements stay access: 'private' (set client-side by the caller,
// UploadStatementForm.tsx) — same as every other statement blob, only
// ever reachable through /api/statements/[id]/download.
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== "client" || !user.client) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const clientId = user.client.id;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Defense in depth: the token this issues can only ever write
        // under this client's own prefix, no matter what pathname a
        // tampered client-side call asks for.
        if (!pathname.startsWith(`statements/${clientId}/`)) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ["application/pdf", "image/png", "image/jpeg"],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // generous for a scanned statement
        };
      },
      // No onUploadCompleted — the client calls recordStatementUpload
      // itself right after upload() resolves, so the DB row lands
      // without depending on Blob's server-to-server completion webhook
      // (which needs a publicly reachable callback URL and doesn't fire
      // in local dev).
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
