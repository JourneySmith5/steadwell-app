"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { sendEmailDraft } from "@/lib/email";

export type SendEmailState = { message?: string } | undefined;

export async function sendEmail(
  clientId: string,
  emailId: string,
  _state: SendEmailState,
  formData: FormData
): Promise<SendEmailState> {
  await requireCoach();
  const subject = String(formData.get("subject") || "");
  const body = String(formData.get("body") || "");
  if (!subject.trim() || !body.trim()) {
    return { message: "Subject and body can't be empty." };
  }
  await sendEmailDraft(emailId, subject, body);
  redirect(`/coach/clients/${clientId}`);
}
