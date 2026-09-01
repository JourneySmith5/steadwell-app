import "server-only";
import { getStripe } from "@/lib/stripe";
import { findActiveDiscountCode, incrementRedemptionCount } from "@/lib/repo/discountCodes";
import { getBirthday20Eligibility } from "@/lib/promotions";
import {
  createPendingPayment,
  findPaymentById,
  claimPaymentForFulfillment,
} from "@/lib/repo/payments";
import { createInvitation } from "@/lib/repo/invitations";
import { createEmailDraft, accountInvitationTemplate } from "@/lib/email";
import { setClientStatus } from "@/lib/status";
import { findClientById, type ClientRow } from "@/lib/repo/clients";
import { FOUNDATION_FEE_CENTS } from "@/lib/enums";

// One code typed in by hand (§9 stacking: "all applicable codes stack" —
// additively, capped at 100% off) plus BIRTHDAY20 applied automatically
// when it's the client's birth month. A client can never apply the same
// code twice — there's only ever one text field — and can't type their way
// into BIRTHDAY20 or THANKYOU15 early: BIRTHDAY20 below only ever comes
// from the automatic eligibility check, never from what was typed, and
// THANKYOU15 is Accountability-only (see startAccountabilityCheckout in
// src/lib/accountability.ts) so it's rejected here outright.
//
// client is optional/nullable so a not-yet-known client (this runs before
// login on the public agreement/checkout flow) degrades to "no birth-month
// discount" rather than throwing — realistically that's the common case
// here anyway, since date of birth isn't collected until Foundation Intake,
// which happens *after* this one-time fee is paid.
export async function computeFoundationPriceCents(
  discountCode: string | null | undefined,
  client: Pick<ClientRow, "dateOfBirth"> | null | undefined
): Promise<{
  amountCents: number;
  appliedCodes: { code: string; percentOff: number }[];
  totalPercentOff: number;
  invalidCode: boolean;
}> {
  const applied: { code: string; percentOff: number }[] = [];
  let invalidCode = false;

  const trimmed = discountCode?.trim();
  if (trimmed) {
    const upper = trimmed.toUpperCase();
    if (upper === "THANKYOU15") {
      invalidCode = true; // Accountability-only, never valid on this one-time fee.
    } else if (upper === "BIRTHDAY20") {
      // No free-text bypass — handled below via the real eligibility check
      // whether or not it was typed, so typing it outside the birth month
      // just does nothing (not flagged invalid either; see the checkout
      // page, which only shows the "invalid" message for a code that isn't
      // getting applied at all).
    } else {
      const found = await findActiveDiscountCode(trimmed);
      if (found) applied.push({ code: found.code, percentOff: found.percentOff });
      else invalidCode = true;
    }
  }

  const birthday = await getBirthday20Eligibility(client);
  if (birthday.eligible) applied.push({ code: "BIRTHDAY20", percentOff: birthday.percentOff });

  const totalPercentOff = Math.min(100, applied.reduce((sum, a) => sum + a.percentOff, 0));
  const amountCents = Math.round(FOUNDATION_FEE_CENTS * (1 - totalPercentOff / 100));
  return { amountCents, appliedCodes: applied, totalPercentOff, invalidCode };
}

// Starts a Foundation checkout. With real Stripe keys configured, creates an
// actual Checkout Session and returns its hosted URL. Without them (this
// build, until you set STRIPE_SECRET_KEY — see README), records the same
// pending payment and hands back a paymentId for the clearly-labeled
// test-mode confirm page to finish with — see
// /agreement/[token]/checkout/{page,confirm/page}.tsx.
export async function startFoundationCheckout(
  client: ClientRow,
  token: string,
  discountCode: string | null
): Promise<{ mode: "stripe"; url: string } | { mode: "test"; paymentId: string }> {
  const { amountCents, appliedCodes } = await computeFoundationPriceCents(discountCode, client);
  // payments.discount_code is a single text column (predates stacking) —
  // joined here rather than widened into a real one-to-many relationship,
  // since it's a record of what happened on this payment, not something
  // anything else queries by individual code.
  const appliedCode = appliedCodes.length > 0 ? appliedCodes.map((a) => a.code).join("+") : null;
  const stripe = getStripe();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!stripe) {
    const payment = await createPendingPayment({
      clientId: client.id,
      type: "foundation",
      amountCents,
      discountCode: appliedCode,
      stripeCheckoutSessionId: null,
    });
    return { mode: "test", paymentId: payment.id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: client.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: "Steadwell Financial Foundation" },
        },
      },
    ],
    metadata: { clientId: client.id, type: "foundation", discountCode: appliedCode ?? "" },
    success_url: `${appUrl}/agreement/${token}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/agreement/${token}/checkout`,
  });

  const payment = await createPendingPayment({
    clientId: client.id,
    type: "foundation",
    amountCents,
    discountCode: appliedCode,
    stripeCheckoutSessionId: session.id,
  });

  if (!session.url) throw new Error(`Stripe did not return a Checkout URL for payment ${payment.id}`);
  return { mode: "stripe", url: session.url };
}

// The single place "payment succeeded" turns into pipeline state — called by
// the real Stripe webhook (checkout.session.completed), the checkout
// success page as an idempotent fallback in case the webhook hasn't landed
// yet, and the test-mode "Complete Test Payment" action. All three paths
// funnel through here so they can never drift apart in what happens next.
//
// Mirrors what the pre-Stripe dev stand-in (markPaymentReceivedDev) used to
// do directly in the coach's client actions — see git history / the
// previous build of this file if you need the old version for reference.
export async function fulfillFoundationPayment(paymentId: string, stripePaymentIntentId?: string) {
  const existing = await findPaymentById(paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found`);

  // Atomic claim, not a separate check-then-write — with a real async DB
  // driver, two near-simultaneous calls (the Stripe webhook and the
  // checkout success-page fallback both firing for the same payment) can
  // genuinely interleave. claimPaymentForFulfillment does the check and the
  // write as one statement, so only one caller ever "wins" it, and the loser
  // sees claimed === undefined and returns here — same idempotent behavior
  // as before, now race-safe. See the comment on claimPaymentForFulfillment.
  const claimed = await claimPaymentForFulfillment(paymentId, stripePaymentIntentId);
  if (!claimed) return;

  // Spend one-time codes only now that the payment is genuinely real —
  // discountCode is "+"-joined (see startFoundationCheckout); a no-op for
  // any code without a redemption cap (THANKYOU15, BIRTHDAY20, ordinary
  // reusable codes), so it's safe to call for every code on this payment.
  if (claimed.discountCode) {
    for (const code of claimed.discountCode.split("+")) {
      await incrementRedemptionCount(code);
    }
  }

  const client = await findClientById(claimed.clientId);
  if (!client) throw new Error(`Client ${claimed.clientId} not found`);

  await setClientStatus(client.id, "payment_received", "Payment received");

  // §21: this draft still needs a human to review and send — payment being
  // real now doesn't change that. It shows up on the client's coach-side
  // detail page like every other system-generated email.
  const invitation = await createInvitation(client.id);
  const inviteUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${invitation.token}`;
  const { subject, body } = accountInvitationTemplate(client.fullName, inviteUrl);
  await createEmailDraft({ clientId: client.id, template: "account_invitation", subject, body });

  await setClientStatus(client.id, "account_setup_pending", "Invitation drafted, pending Coach review");
}
