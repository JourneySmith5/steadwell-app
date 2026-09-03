"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { sendCoachMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";

export async function replyToClient(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);

  const body = parseNotes(formData, "body");
  if (body) {
    await sendCoachMessage(clientId, body);
  }
  redirect(`/coach/clients/${clientId}/messages`);
}
