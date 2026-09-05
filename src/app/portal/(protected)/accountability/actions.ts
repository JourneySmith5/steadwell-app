"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import {
  startAccountabilityCheckout,
  fulfillAccountabilityEnrollment,
  changeAccountabilityTier,
  cancelAccountabilitySubscription,
  findTier,
} from "@/lib/accountability";
import { findMeetingById, setClientProgressNotes } from "@/lib/repo/meetings";
import { findSubscriptionByClientId } from "@/lib/repo/subscriptions";
import { recordMeetingRedemption, countMeetingRedemptionsThisMonth } from "@/lib/repo/meetingRedemptions";
import { findBookingLinkUrl } from "@/lib/repo/bookingLinks";

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

// Journey's ask: a client can only schedule as many meetings a month as
// their package includes. This app has no Google Calendar API integration
// (see the Accountability portal page's fallback copy), so it can't see or
// gate the actual booking on Google's side — redeeming a slot IS the gate:
// it's the commitment point, recorded the instant before handing the
// client off to Coach's external booking link, and it re-checks the cap
// server-side rather than trusting that the portal only shows the button
// when slots remain (the same "never trust the UI gate alone" reasoning as
// every other guarded action in this app).
export async function redeemMeetingSlot() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const subscription = await findSubscriptionByClientId(user.client.id);
  const tier = subscription ? findTier(subscription.tier) : undefined;
  // servicesSuspended is redundant with status !== "active" today (Coach
  // can only suspend a past_due subscription — see the client detail
  // page), but checked explicitly anyway rather than relying on that
  // staying true forever, same "never trust one gate alone" reasoning as
  // every other guarded action in this app.
  if (!subscription || subscription.status !== "active" || subscription.servicesSuspended || !tier) {
    redirect("/portal/accountability");
  }

  const redeemedThisMonth = await countMeetingRedemptionsThisMonth(user.client.id);
  if (redeemedThisMonth >= tier.meetingsPerMonth) {
    redirect("/portal/accountability?meetingCapReached=1");
  }

  const bookingUrl = await findBookingLinkUrl("accountability");
  if (!bookingUrl) {
    redirect("/portal/accountability?noBookingLink=1");
  }

  await recordMeetingRedemption(user.client.id);
  redirect(bookingUrl);
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
