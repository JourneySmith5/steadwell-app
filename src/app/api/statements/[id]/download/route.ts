import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { get as getBlob } from "@vercel/blob";
import { getCurrentUser } from "@/lib/dal";
import { findStatementById } from "@/lib/repo/statements";

// Not a page — Route Handlers aren't covered by the portal/coach layouts'
// auth checks (see AGENTS.md / earlier DAL comments), so this checks who's
// asking itself: either Coach (any client), or the client who owns this
// statement. Nobody else, logged in or not.
//
// The actual file lives in Vercel Blob as a *private* object — its URL
// alone (stored in our own DB, never sent to the browser) isn't enough to
// download it without our BLOB_READ_WRITE_TOKEN. This route is the only
// path a statement's bytes ever reach a browser through.
//
// Defaults to an *inline* disposition — opens in a new tab and renders
// there (PDFs/images) instead of prompting "Save As" — because Coach
// reviewing a lot of clients' bank statements didn't want them all
// piling up in a Downloads folder just to look at them. Pass ?dl=1 for
// the rare case an actual saved copy is wanted.
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await props.params;
  const statement = await findStatementById(id);
  if (!statement) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isCoach = user.role === "coach";
  const isOwningClient = user.role === "client" && user.client?.id === statement.clientId;
  if (!isCoach && !isOwningClient) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const result = await getBlob(statement.fileUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "The file couldn't be retrieved from storage." }, { status: 502 });
  }

  const filename = statement.originalFilename || `${statement.accountNickname}-statement`;
  const forceDownload = new URL(request.url).searchParams.get("dl") === "1";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
