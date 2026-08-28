"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { findSubscriptionByClientId } from "@/lib/repo/subscriptions";
import { getStripe } from "@/lib/stripe";

// Real Stripe Billing Portal integration — hands the client off to Stripe's
// hosted page for updating a card or viewing invoices. Gated on having a
// real Stripe subscription (there's no Stripe Customer object at all in
// test mode — see src/lib/stripe.ts), so this only does anything once
// STRIPE_SECRET_KEY is set and the client has actually enrolled in
// Accountability through the real flow.
export async function manageBilling() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const stripe = getStripe();
  const subscription = await findSubscriptionByClientId(user.client.id);
  if (!stripe || !subscription?.stripeSubscriptionId) redirect("/portal/billing");

  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer.id;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/portal/billing`,
  });
  redirect(portalSession.url);
}
