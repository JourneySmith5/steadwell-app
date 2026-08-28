import "server-only";
import Stripe from "stripe";

// No Stripe account exists yet for this build (see README) — everything in
// this file, the checkout flow (src/lib/checkout.ts), and the webhook route
// (src/app/api/webhooks/stripe/route.ts) is real, working Stripe integration
// code. It just doesn't run until STRIPE_SECRET_KEY is set. Until then,
// getStripe() returns null and the checkout flow falls back to a clearly
// labeled test-mode path that exercises the same downstream logic
// (agreement gate, discount codes, payment state, account invitation) —
// see src/lib/checkout.ts for exactly where that fork happens.

export const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}
