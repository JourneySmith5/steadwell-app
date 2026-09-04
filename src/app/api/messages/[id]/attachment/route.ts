import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { get as getBlob } from "@vercel/blob";
import { getCurrentUser } from "@/lib/dal";
import { findMessageById } from "@/lib/repo/messages";
import { findClientById } from "@/lib/repo/clients";

// Mirrors src/app/api/statements/[id]/download/route.ts exactly — same
// reasoning applies here: Route Handlers aren't covered by the portal/coach
// layouts' auth checks, so this checks who's asking itself, and the file
// lives in Vercel Blob as a *private* object that only this route can
// actually fetch.
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await props.params;
  const message = await findMessageById(id);
  if (!message || !message.attachmentUrl) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isOwner = user.role === "owner";
  const isAssignedCoach =
    user.role === "coach" && (await findClientById(message.clientId))?.coachId === user.id;
  const isOwningClient = user.role === "client" && user.client?.id === message.clientId;
  if (!isOwner && !isAssignedCoach && !isOwningClient) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const result = await getBlob(message.attachmentUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "The file couldn't be retrieved from storage." }, { status: 502 });
  }

  const filename = message.attachmentFilename || "attachment";
  const forceDownload = new URL(request.url).searchParams.get("dl") === "1";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || message.attachmentContentType || "application/octet-stream",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
