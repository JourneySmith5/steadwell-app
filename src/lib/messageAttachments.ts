import "server-only";
import { put } from "@vercel/blob";

// Shared by both the client's compose form (src/app/portal/(protected)/
// messages/actions.ts) and Coach's reply form (src/app/coach/(protected)/
// clients/[id]/messages/actions.ts) — one validation/upload path so the
// two sides can't silently drift (e.g. one accepting a file type the
// other rejects).

// Documents & images — covers a photo of a letter, a screenshot, a scanned
// form, or an actual Word/Excel file.
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
// Browsers don't always set a reliable `type` for every format (some set
// "" for HEIC, for instance) — fall back to the extension so a real phone
// photo isn't rejected just because the browser was vague about its MIME
// type.
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp", "doc", "docx", "xls", "xlsx"];

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB — generous for a phone photo or scanned PDF.

export interface UploadedMessageAttachment {
  url: string;
  filename: string;
  contentType: string | null;
}

export type UploadMessageAttachmentResult =
  | { ok: true; attachment: UploadedMessageAttachment }
  | { ok: false; error: string };

// access: 'private' — same reasoning as Statements: the blob's URL only
// ever lives in our own database, never sent to the browser directly.
// Both parties download through /api/messages/[id]/attachment, which
// checks the requester actually owns (or coaches) this client first.
export async function uploadMessageAttachment(clientId: string, file: File): Promise<UploadMessageAttachmentResult> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: `That file is too large — the limit is ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.` };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const looksAllowedByExtension = ALLOWED_EXTENSIONS.includes(extension ?? "");
  if (file.type && !ALLOWED_TYPES.has(file.type) && !looksAllowedByExtension) {
    return { ok: false, error: "That file type isn't supported — try a PDF, image, or Word/Excel document." };
  }

  const blob = await put(`message-attachments/${clientId}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return { ok: true, attachment: { url: blob.url, filename: file.name, contentType: file.type || null } };
}
