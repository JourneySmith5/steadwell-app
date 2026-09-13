"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireClient } from "@/lib/dal";
import { createStatement, deleteStatement, findStatementById } from "@/lib/repo/statements";

// The blob's bytes are already sitting in storage by the time this runs —
// UploadStatementForm.tsx uploads straight from the browser to Blob (via
// @vercel/blob/client's upload() against /api/statements/upload-token),
// which is what lets a batch of several scanned statements go through at
// once without hitting the serverless function's request-body limit (see
// next.config.ts). This just records the resulting row, once per file, the
// same way the old form-submit uploadStatement used to — called directly
// (not through a <form action>) right after each browser-side upload
// resolves.
//
// No accountNickname anymore — requiring one turned out to be an
// unnecessary extra step (a client uploading several accounts' worth of
// files had to make a separate trip per account just to label them, and
// Coach opens each file directly anyway; see schema.sql's "Additive
// migrations" note, same reasoning as when month labeling was dropped).
export type RecordStatementUploadResult = { ok: true } | { ok: false; error: string };

export async function recordStatementUpload(params: {
  fileUrl: string;
  originalFilename: string;
}): Promise<RecordStatementUploadResult> {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  // Defense in depth: onBeforeGenerateToken (upload-token/route.ts) already
  // scopes the token to this client's own prefix, but nothing stops a
  // tampered client-side call from passing back some other fileUrl here —
  // refuse to file a DB row pointing outside this client's own statements.
  let pathname: string;
  try {
    pathname = new URL(params.fileUrl).pathname;
  } catch {
    return { ok: false, error: "That upload didn't come through correctly." };
  }
  if (!pathname.includes(`/statements/${user.client.id}/`)) {
    return { ok: false, error: "That upload didn't come through correctly." };
  }

  await createStatement({
    clientId: user.client.id,
    fileUrl: params.fileUrl,
    originalFilename: params.originalFilename,
  });

  revalidatePath("/portal/foundation/statements");
  return { ok: true };
}

export async function removeStatement(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const id = String(formData.get("id") || "");
  const statement = await findStatementById(id);
  if (!statement || statement.clientId !== user.client.id) {
    redirect("/portal/foundation/statements");
  }

  await deleteStatement(id);
  try {
    await del(statement.fileUrl);
  } catch {
    // The DB row is gone either way — a leftover orphaned blob (not
    // reachable from the UI anymore) isn't worth failing this action over.
  }

  redirect("/portal/foundation/statements");
}
