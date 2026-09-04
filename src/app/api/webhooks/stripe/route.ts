import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { findPaymentByCheckoutSessionId } from "@/lib/repo/payments";
import { fulfillFoundationPayment } from "@/lib/checkout";
import { fulfillAccountabilityEnrollment } from "@/lib/accountability";
import { findSubscriptionByStripeId, setSubscriptionStatus } from "@/lib/repo/subscriptions";
import { recordAccountabilityPayment } from "@/lib/repo/accountabilityPayments";
import { setClientStatus } from "@/lib/status";
import type { SubscriptionStatus } from "@/lib/enums";

// Real Stripe webhook endpoint — this is the reliable fulfillment path (the
// checkout success page also fulfills, idempotently, as a fallback in case
// this hasn't landed yet by the time the client's browser redirects back;
// see src/app/agreement/[token]/checkout/success/page.tsx).
//
// Point Stripe's webhook config at <APP_URL>/api/webhooks/stripe once
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set — see README "Before
// this goes live". Locally, `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
// (Stripe CLI) is the standard way to receive real test-mode events.
export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe isn't configured on this deployment." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Signature verification failed: ${err}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode === "subscription") {
      // §9 Accountability enrollment — see src/lib/accountability.ts for the
      // full fork (this mirrors the Foundation fee's checkout.session.completed
      // handling above it, just for a subscription instead of a one-time charge).
      const clientId = session.metadata?.clientId;
      const tier = session.metadata?.tier;
      if (clientId && tier) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
        await fulfillAccountabilityEnrollment(clientId, tier, subscriptionId);
      }
    } else if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      // "no_payment_required" is Stripe's real status for a Checkout Session
      // whose total came to $0 — a 100%-off code (CHARITY100, or any stack
      // that hits the 100% cap) never gets charged a card at all, so it's
      // never "paid". Found this by working through exactly what CHARITY100
      // does to a live Checkout Session before Journey's actual charity
      // client hits it — without this, the webhook would silently do
      // nothing for a free checkout and that client would never get their
      // account-invitation email.
      const payment = await findPaymentByCheckoutSessionId(session.id);
      if (payment) {
        await fulfillFoundationPayment(payment.id, (session.payment_intent as string) ?? undefined);
      }
    }
  }

  // Keeps the locally-stored Accountability subscription status in sync with
  // Stripe for anything that happens outside this app's own actions — a
  // failed renewal, a cancellation via Stripe's Billing Portal, etc.
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const local = await findSubscriptionByStripeId(sub.id);
    if (local) {
      const status: SubscriptionStatus = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
      await setSubscriptionStatus(local.clientId, status);
    }
  }

  // The real Accountability revenue ledger a coach's /coach/billing invoice
  // is computed from (Journey's ask: a coach only gets paid for a month a
  // client actually paid for, not a live-subscription projection — see
  // schema.sql's comment on accountability_payments). Fires once for the
  // very first payment at checkout and once per renewal after that;
  // recordAccountabilityPayment is idempotent on the invoice's own id, so a
  // Stripe retry of an event this app already processed can't double-count
  // it. A failed renewal fires invoice.payment_failed instead — deliberately
  // not handled here, since nothing should be recorded (or billed to a
  // coach) for a charge that didn't actually collect.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    // This Stripe API version nests the generating subscription under
    // parent.subscription_details rather than a top-level invoice.subscription
    // field (that field was removed) — found by checking node_modules/stripe's
    // own .d.ts for the pinned SDK version rather than assuming the older shape.
    const subscriptionDetails = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
    const stripeSubscriptionId =
      typeof subscriptionDetails?.subscription === "string"
        ? subscriptionDetails.subscription
        : (subscriptionDetails?.subscription?.id ?? null);
    if (stripeSubscriptionId) {
      const local = await findSubscriptionByStripeId(stripeSubscriptionId);
      if (local) {
        const paidAtSeconds = invoice.status_transitions?.paid_at ?? invoice.created;
        await recordAccountabilityPayment({
          clientId: local.clientId,
          subscriptionId: local.id,
          amountCents: invoice.amount_paid,
          stripeInvoiceId: invoice.id,
          paidAt: new Date(paidAtSeconds * 1000).toISOString(),
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const local = await findSubscriptionByStripeId(sub.id);
    if (local) {
      await setSubscriptionStatus(local.clientId, "canceled");
      await setClientStatus(local.clientId, "canceled", "Accountability subscription canceled via Stripe");
    }
  }

  return NextResponse.json({ received: true });
}
