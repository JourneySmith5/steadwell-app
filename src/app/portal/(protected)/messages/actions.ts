"use server";

import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { requireClient } from "@/lib/dal";
import { sendClientMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";

function fail(message: string): never {
  redirect("/portal/messages?error=" + encodeURIComponent(message));
}

// Documents & images — covers a photo of a letter, a screenshot, a scanned
// form, or an actual Word/Excel file. Not the same allowlist as Statements
// (which is really just PDF/image bank statements) — a message attachment
// can be anything reasonable someone might need to send Coach mid-
// conversation.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB — generous for a phone photo or scanned PDF.

export async function sendMessage(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const body = parseNotes(formData, "body");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!body && !hasFile) fail("Type a message or attach a file.");

  if (hasFile) {
    const uploadedFile = file as File;
    if (uploadedFile.size > MAX_ATTACHMENT_BYTES) {
      fail(`That file is too large — the limit is ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`);
    }
    // Browsers don't always set a reliable `type` for every format (some
    // set "" for HEIC, for instance) — fall back to the extension so a
    // real phone photo isn't rejected just because the browser was vague
    // about its MIME type.
    const extension = uploadedFile.name.split(".").pop()?.toLowerCase();
    const looksAllowedByExtension = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp", "doc", "docx", "xls", "xlsx"].includes(
      extension ?? ""
    );
    if (uploadedFile.type && !ALLOWED_TYPES.has(uploadedFile.type) && !looksAllowedByExtension) {
      fail("That file type isn't supported — try a PDF, image, or Word/Excel document.");
    }

    // access: 'private' — same reasoning as Statements: the blob's URL only
    // ever lives in our own database, never sent to the browser directly.
    // Both parties download through /api/messages/[id]/attachment, which
    // checks the requester actually owns (or coaches) this client first.
    const blob = await put(`message-attachments/${user.client.id}/${Date.now()}-${uploadedFile.name}`, uploadedFile, {
      access: "private",
      addRandomSuffix: true,
      contentType: uploadedFile.type || undefined,
    });

    await sendClientMessage(user.client.id, body, {
      url: blob.url,
      filename: uploadedFile.name,
      contentType: uploadedFile.type || null,
    });
  } else if (body) {
    await sendClientMessage(user.client.id, body);
  }

  redirect("/portal/messages");
}
