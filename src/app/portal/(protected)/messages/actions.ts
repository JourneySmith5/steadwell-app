"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { sendClientMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";
import { uploadMessageAttachment } from "@/lib/messageAttachments";

function fail(message: string): never {
  redirect("/portal/messages?error=" + encodeURIComponent(message));
}

export async function sendMessage(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const body = parseNotes(formData, "body");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!body && !hasFile) fail("Type a message or attach a file.");

  if (hasFile) {
    const result = await uploadMessageAttachment(user.client.id, file as File);
    if (!result.ok) fail(result.error);
    await sendClientMessage(user.client.id, body, result.attachment);
  } else if (body) {
    await sendClientMessage(user.client.id, body);
  }

  redirect("/portal/messages");
}
