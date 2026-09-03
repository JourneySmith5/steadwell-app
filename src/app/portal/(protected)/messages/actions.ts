"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { sendClientMessage } from "@/lib/messages";
import { parseNotes } from "@/lib/formHelpers";

export async function sendMessage(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const body = parseNotes(formData, "body");
  if (body) {
    await sendClientMessage(user.client.id, body);
  }
  redirect("/portal/messages");
}
