"use server";

import { redirect } from "next/navigation";
import { put, del } from "@vercel/blob";
import { requireClient } from "@/lib/dal";
import { createStatement, deleteStatement, findStatementById } from "@/lib/repo/statements";

function fail(message: string): never {
  redirect("/portal/foundation/statements?error=" + encodeURIComponent(message));
}

export async function uploadStatement(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const file = formData.get("file");
  const accountNickname = String(formData.get("accountNickname") || "").trim();
  const month = String(formData.get("month") || "").trim();

  if (!accountNickname) fail("Which account is this a statement for?");
  if (!month) fail("Which month is this statement for?");
  if (!(file instanceof File) || file.size === 0) fail("Choose a file to upload.");

  // access: 'private' — this is a real financial document, not something
  // that should be reachable by anyone who guesses or leaks the URL. The
  // blob's URL only ever lives in our own database; clients and Coach both
  // download through /api/statements/[id]/download, which checks the
  // requester actually owns (or coaches) this client before fetching it
  // from Blob storage server-side and streaming it back.
  const blob = await put(`statements/${user.client.id}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  await createStatement({
    clientId: user.client.id,
    accountNickname,
    month,
    fileUrl: blob.url,
    originalFilename: file.name,
  });

  redirect("/portal/foundation/statements");
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
