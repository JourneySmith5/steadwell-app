"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { createMeeting, updateMeeting, deleteMeeting, setMeetingStatus } from "@/lib/repo/meetings";
import { findActiveDiscountCode } from "@/lib/repo/discountCodes";
import { createEmailDraft, foundationReviewCompleteTemplate } from "@/lib/email";
import type { MeetingType, MeetingStatus } from "@/lib/enums";
import { parseOptionalText, parseOptionalNotes } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/meetings`;
}

function fieldsFrom(formData: FormData) {
  return {
    type: String(formData.get("type") || "Foundation") as MeetingType,
    scheduledAt: parseOptionalText(formData, "scheduledAt"),
    status: String(formData.get("status") || "scheduled") as MeetingStatus,
    coachNotes: parseOptionalNotes(formData, "coachNotes"),
    clientActionItems: parseOptionalNotes(formData, "clientActionItems"),
    nextMeetingDate: parseOptionalText(formData, "nextMeetingDate"),
  };
}

export async function addMeeting(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);
  await createMeeting(clientId, fieldsFrom(formData));
  redirect(path(clientId));
}

export async function saveMeeting(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);
  const id = String(formData.get("id") || "");
  await updateMeeting(id, fieldsFrom(formData));
  redirect(path(clientId));
}

export async function removeMeeting(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);
  await deleteMeeting(String(formData.get("id") || ""));
  redirect(path(clientId));
}

// §9 THANKYOU15 trigger — "sign up for an accountability plan within 24
// hours of completing their Foundations Plan review (triggered by sending
// a completion email with a copy of their plan)." This marks the meeting
// completed and drafts that email with the plan PDF attached; Coach still
// reviews and sends it from the email queue like any other client-facing
// email (§21) — the 24-hour window itself doesn't start until that Send
// click (see setFoundationReviewEmailSentAt, called from sendEmailDraft).
export async function markFoundationReviewCompleteAndEmailPlan(clientId: string, formData: FormData) {
  const { client } = await requireClientAccess(clientId);

  const meetingId = String(formData.get("meetingId") || "");
  if (meetingId) await setMeetingStatus(meetingId, "completed");

  if (client.planStatus !== "active") {
    // No finalized plan to attach — nothing meaningful to send yet.
    redirect(path(clientId));
  }

  const promo = await findActiveDiscountCode("THANKYOU15");
  const { subject, body } = foundationReviewCompleteTemplate(client.fullName, promo?.percentOff ?? null);
  const email = await createEmailDraft({
    clientId,
    template: "foundation_review_complete",
    subject,
    body,
    attachPlanPdf: true,
  });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}
