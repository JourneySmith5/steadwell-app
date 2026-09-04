"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { sendCoachMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";
import { uploadMessageAttachment } from "@/lib/messageAttachments";

function fail(clientId: string, message: string): never {
  redirect(`/coach/clients/${clientId}/messages?error=` + encodeURIComponent(message));
}

export async function replyToClient(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);

  const body = parseNotes(formData, "body");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!body && !hasFile) fail(clientId, "Type a message or attach a file.");

  if (hasFile) {
    const result = await uploadMessageAttachment(clientId, file as File);
    if (!result.ok) fail(clientId, result.error);
    await sendCoachMessage(clientId, body, result.attachment);
  } else if (body) {
    await sendCoachMessage(clientId, body);
  }

  redirect(`/coach/clients/${clientId}/messages`);
}
