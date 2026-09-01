"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import {
  startAccountabilityCheckout,
  fulfillAccountabilityEnrollment,
  changeAccountabilityTier,
  cancelAccountabilitySubscription,
} from "@/lib/accountability";
import { findMeetingById, setClientProgressNotes } from "@/lib/repo/meetings";

export async function chooseAccountabilityTier(tierId: string) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const result = await startAccountabilityCheckout(user.client, tierId);
  if (result.mode === "stripe") {
    redirect(result.url);
  }

  // Test-mode stand-in — same idea as the Foundation fee's "Complete Test
  // Payment" button (see /agreement/[token]/checkout/confirm): calls the
  // exact same fulfillment function the real Stripe webhook would call, so
  // nothing downstream needs to know or care which path this came through.
  await fulfillAccountabilityEnrollment(user.client.id, tierId, null);
  redirect("/portal/accountability?enrolled=1&test=1");
}

export async function changeTier(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const tierId = String(formData.get("tierId") || "");
  await changeAccountabilityTier(user.client.id, tierId);
  redirect("/portal/accountability?changed=1");
}

export async function cancelSubscription() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  await cancelAccountabilitySubscription(user.client.id);
  redirect("/portal/account");
}

// Lets the client jot progress notes ahead of their own Accountability
// meeting — Journey's ask, so those notes are on hand for the call. Loads
// the meeting first and checks ownership rather than trusting the posted
// meetingId outright: nothing stops a client from editing the form and
// submitting another client's meeting id.
export async function saveProgressNotes(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const meetingId = String(formData.get("meetingId") || "");
  const notes = String(formData.get("notes") || "").trim();

  const meeting = await findMeetingById(meetingId);
  if (!meeting || meeting.clientId !== user.client.id) redirect("/portal/accountability");

  await setClientProgressNotes(meetingId, notes || null);
  redirect("/portal/accountability?notesSaved=1");
}
