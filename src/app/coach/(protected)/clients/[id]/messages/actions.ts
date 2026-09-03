"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { sendCoachMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";

export async function replyToClient(clientId: string, formData: FormData) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();

  const body = parseNotes(formData, "body");
  if (body) {
    await sendCoachMessage(clientId, body);
  }
  redirect(`/coach/clients/${clientId}/messages`);
}
