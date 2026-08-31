import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { setClientStatus } from "@/lib/status";
import {
  upsertSubscription,
  setSubscriptionStatus,
  setSubscriptionTier,
  findSubscriptionByClientId,
} from "@/lib/repo/subscriptions";
import { findClientById, type ClientRow } from "@/lib/repo/clients";
import { ACCOUNTABILITY_TIERS } from "@/lib/enums";
import { getThankYou15Eligibility, getBirthday20Eligibility } from "@/lib/promotions";

// One ad-hoc Stripe Coupon per eligible promo, each with its own correct
// lifetime (THANKYOU15 repeats for 3 months; BIRTHDAY20 is a single cycle)
// — Stripe natively supports multiple simultaneous discounts on a
// subscription (see the `discounts` array below), so §9's "let them stack"
// is Stripe combining these on the invoice itself rather than this app
// trying to pre-merge two differently-shaped discounts into one coupon.
async function buildEnrollmentDiscounts(
  stripe: Stripe,
  client: ClientRow
): Promise<Stripe.Checkout.SessionCreateParams.Discount[]> {
  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

  const thankYou = await getThankYou15Eligibility(client);
  if (thankYou.eligible) {
    const coupon = await stripe.coupons.create({
      percent_off: thankYou.percentOff,
      duration: "repeating",
      duration_in_months: 3,
      name: `THANKYOU15 — ${thankYou.percentOff}% off first 3 months`,
    });
    discounts.push({ coupon: coupon.id });
  }

  const birthday = await getBirthday20Eligibility(client);
  if (birthday.eligible) {
    const coupon = await stripe.coupons.create({
      percent_off: birthday.percentOff,
      duration: "once",
      name: `BIRTHDAY20 — ${birthday.percentOff}% off this month`,
    });
    discounts.push({ coupon: coupon.id });
  }

  return discounts;
}

export function findTier(tierId: string) {
  return ACCOUNTABILITY_TIERS.find((t) => t.id === tierId);
}

// Real Stripe Prices are created ad hoc here rather than once at setup time
// and referenced by a stored ID — reasonable for three fixed tiers, and it
// keeps this build self-contained (no "create these in the Stripe Dashboard
// first" manual step). A production deployment would more typically create
// the three Prices once and reference stable IDs via env vars instead.
async function getTierPriceId(tierId: string): Promise<string> {
  const stripe = getStripe();
  const tier = findTier(tierId);
  if (!stripe || !tier) throw new Error(`Unknown Accountability tier or Stripe not configured: ${tierId}`);
  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: tier.priceCents,
    recurring: { interval: "month" },
    product_data: { name: `Steadwell ${tier.label}` },
  });
  return price.id;
}

// Starts Accountability enrollment — mirrors startFoundationCheckout
// (src/lib/checkout.ts): same Stripe-configured/test-mode fork, just
// mode: "subscription" instead of "payment". No pre-account agreement gate
// to pass through first (the client is already authenticated in the
// portal), so there's no separate token/link like the Foundation checkout.
export async function startAccountabilityCheckout(
  client: ClientRow,
  tierId: string
): Promise<{ mode: "stripe"; url: string } | { mode: "test" }> {
  const tier = findTier(tierId);
  if (!tier) throw new Error(`Unknown Accountability tier: ${tierId}`);

  const stripe = getStripe();
  if (!stripe) return { mode: "test" };

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const priceId = await getTierPriceId(tierId);
  const discounts = await buildEnrollmentDiscounts(stripe, client);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: client.email,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(discounts.length > 0 ? { discounts } : {}),
    metadata: { clientId: client.id, tier: tier.id },
    success_url: `${appUrl}/portal/accountability?enrolled=1`,
    cancel_url: `${appUrl}/portal/accountability`,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL for Accountability enrollment");
  return { mode: "stripe", url: session.url };
}

// The one place "Accountability enrollment succeeded" turns into
// subscription + pipeline state — called by the real Stripe webhook
// (checkout.session.completed, mode "subscription") and directly by the
// test-mode enrollment action. Idempotent the same way
// fulfillFoundationPayment is (src/lib/checkout.ts): upsertSubscription and
// the accountability_active guard below both tolerate being called twice
// for the same enrollment.
export async function fulfillAccountabilityEnrollment(clientId: string, tierId: string, stripeSubscriptionId: string | null) {
  const client = await findClientById(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  await upsertSubscription({ clientId, tier: tierId, status: "active", stripeSubscriptionId, currentPeriodEnd: null });

  if (client.status !== "accountability_active") {
    await setClientStatus(clientId, "accountability_active", `Client enrolled in ${findTier(tierId)?.label ?? tierId}`);
  }
}

// Self-service tier change (§9) — no Coach approval required. With real
// Stripe, swaps the subscription's price in place (Stripe prorates by
// default); in test mode, just updates the stored tier directly.
export async function changeAccountabilityTier(clientId: string, newTierId: string) {
  const tier = findTier(newTierId);
  if (!tier) throw new Error(`Unknown Accountability tier: ${newTierId}`);

  const subscription = await findSubscriptionByClientId(clientId);
  if (!subscription) throw new Error(`No Accountability subscription found for client ${clientId}`);

  const stripe = getStripe();
  if (stripe && subscription.stripeSubscriptionId) {
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const itemId = stripeSub.items.data[0]?.id;
    if (itemId) {
      const priceId = await getTierPriceId(newTierId);
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
      });
    }
  }

  await setSubscriptionTier(clientId, tier.id);
}

// Self-service cancellation (§9) — the client controls this directly, which
// uniformly triggers Offboarding (§16) via setClientStatus, same as Coach
// closing a record or a client declining Accountability at plan
// presentation (see declineAccountability in src/app/portal/(protected)/plan/actions.ts).
export async function cancelAccountabilitySubscription(clientId: string) {
  const subscription = await findSubscriptionByClientId(clientId);
  const stripe = getStripe();
  if (stripe && subscription?.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  }
  if (subscription) await setSubscriptionStatus(clientId, "canceled");
  await setClientStatus(clientId, "canceled", "Client canceled Accountability subscription");
}
