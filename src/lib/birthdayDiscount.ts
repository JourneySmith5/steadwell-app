import "server-only";
import { getStripe } from "@/lib/stripe";
import { findClientById } from "@/lib/repo/clients";
import { listActiveSubscriptions, setBirthdayDiscountYearApplied } from "@/lib/repo/subscriptions";
import { getBirthday20Eligibility } from "@/lib/promotions";

// §9 BIRTHDAY20 — "If they are on an accountability plan, this discount
// gets automatically applied to their bill for that month." Unlike
// THANKYOU15 (applied once, at the moment of enrollment — see
// startAccountabilityCheckout in src/lib/accountability.ts), a client can
// be mid-subscription for years before their birth month comes around
// again, so this needs an ongoing daily check rather than a one-time hook.
// Same "no real cron/scheduler in dev" situation as the Offboarding sweep
// (src/lib/offboarding.ts) — this runs from the same daily
// /api/cron/offboarding-sweep route and the same Coach Dashboard "Run
// Sweep Now" button, so it needs no separate Vercel Cron schedule slot.
//
// birthdayDiscountYearApplied guards against re-applying the same year —
// checked before doing anything else so a subscription already handled
// this year is skipped without even re-deriving eligibility.
export async function runBirthdayDiscountSweep(now: Date = new Date()): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;
  const currentYear = now.getUTCFullYear();
  const stripe = getStripe();

  for (const sub of await listActiveSubscriptions()) {
    if (sub.birthdayDiscountYearApplied === currentYear) {
      skipped++;
      continue;
    }

    const client = await findClientById(sub.clientId);
    if (!client) {
      skipped++;
      continue;
    }

    const eligibility = await getBirthday20Eligibility(client, now);
    if (!eligibility.eligible) {
      skipped++;
      continue;
    }

    // Test-mode subscriptions (no real Stripe id) have no real bill to
    // discount — nothing to do beyond marking the year so this doesn't
    // re-check them daily for the rest of their birth month.
    if (stripe && sub.stripeSubscriptionId) {
      const coupon = await stripe.coupons.create({
        percent_off: eligibility.percentOff,
        duration: "once",
        name: `BIRTHDAY20 — ${eligibility.percentOff}% off this month`,
      });

      // subscriptions.update's `discounts` REPLACES the existing array
      // wholesale if passed — so any discount already on the subscription
      // (e.g. THANKYOU15, still mid its 3-month run) has to be read back
      // and carried forward explicitly, or this would silently cancel it.
      const current = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const existingDiscounts = (current.discounts ?? []).map((d) => ({
        discount: typeof d === "string" ? d : d.id,
      }));
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        discounts: [...existingDiscounts, { coupon: coupon.id }],
      });
    }

    await setBirthdayDiscountYearApplied(sub.clientId, currentYear);
    applied++;
  }

  return { applied, skipped };
}
