"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import {
  startAccountabilityCheckout,
  fulfillAccountabilityEnrollment,
  changeAccountabilityTier,
  cancelAccountabilitySubscription,
} from "@/lib/accountability";

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
