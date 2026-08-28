import { run, get, all, newId, nowIso } from "@/lib/db/client";
import type { PaymentStatus } from "@/lib/enums";

interface PaymentDbRow {
  id: string;
  client_id: string;
  type: string;
  amount_cents: number;
  discount_code: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  clientId: string;
  type: string;
  amountCents: number;
  discountCode: string | null;
  status: PaymentStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

function fromRow(row: PaymentDbRow): PaymentRow {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    amountCents: row.amount_cents,
    discountCode: row.discount_code,
    status: row.status as PaymentStatus,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Created the moment checkout starts (real Stripe Checkout Session, or the
// test-mode stand-in — see src/lib/stripe.ts) so there's a record even if
// the client abandons before paying. `stripeCheckoutSessionId` is null for
// a test-mode payment (there's no real Stripe object behind it).
export async function createPendingPayment(params: {
  clientId: string;
  type: string;
  amountCents: number;
  discountCode: string | null;
  stripeCheckoutSessionId: string | null;
}): Promise<PaymentRow> {
  const id = newId();
  await run(
    `INSERT INTO payments (id, client_id, type, amount_cents, discount_code, status, stripe_checkout_session_id, created_at, updated_at)
     VALUES ($id, $clientId, $type, $amount, $discountCode, 'pending', $sessionId, $now, $now)`,
    {
      $id: id,
      $clientId: params.clientId,
      $type: params.type,
      $amount: params.amountCents,
      $discountCode: params.discountCode,
      $sessionId: params.stripeCheckoutSessionId,
      $now: nowIso(),
    }
  );
  return (await findPaymentById(id))!;
}

export async function findPaymentById(id: string): Promise<PaymentRow | undefined> {
  const row = await get<PaymentDbRow>("SELECT * FROM payments WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findPaymentByCheckoutSessionId(sessionId: string): Promise<PaymentRow | undefined> {
  const row = await get<PaymentDbRow>("SELECT * FROM payments WHERE stripe_checkout_session_id = $sessionId", {
    $sessionId: sessionId,
  });
  return row ? fromRow(row) : undefined;
}

export async function findLatestPaymentForClient(clientId: string): Promise<PaymentRow | undefined> {
  const row = await get<PaymentDbRow>(
    "SELECT * FROM payments WHERE client_id = $clientId ORDER BY created_at DESC LIMIT 1",
    { $clientId: clientId }
  );
  return row ? fromRow(row) : undefined;
}

export async function listPaymentsForClient(clientId: string): Promise<PaymentRow[]> {
  const rows = await all<PaymentDbRow>("SELECT * FROM payments WHERE client_id = $clientId ORDER BY created_at DESC", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

// Stripe's webhook only ever tells this app about a *successful* checkout
// (`checkout.session.completed`) — a card decline or an abandoned checkout
// leaves the payment row exactly where createPendingPayment put it: status
// 'pending', forever, with no event to flip it to 'failed'. So "failed
// payment" for the Attention Queue (§11) means status IN ('pending',
// 'failed') and old enough that it's clearly not just a client mid-checkout
// — a real production build would additionally listen for
// `checkout.session.expired` / `payment_intent.payment_failed` to get a real
// 'failed' status instead of inferring it from age.
export async function listStalePendingPayments(hoursThreshold: number): Promise<PaymentRow[]> {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();
  const rows = await all<PaymentDbRow>(
    "SELECT * FROM payments WHERE status IN ('pending','failed') AND created_at < $cutoff ORDER BY created_at ASC",
    { $cutoff: cutoff }
  );
  return rows.map(fromRow);
}

export async function markPaymentStatus(id: string, status: PaymentStatus, stripePaymentIntentId?: string): Promise<void> {
  await run(
    `UPDATE payments SET status = $status, stripe_payment_intent_id = COALESCE($intentId, stripe_payment_intent_id), updated_at = $now WHERE id = $id`,
    { $id: id, $status: status, $intentId: stripePaymentIntentId ?? null, $now: nowIso() }
  );
}

// Atomically claims a payment for fulfillment: flips it to 'paid' only if it
// isn't already, in one round trip, and reports back whether *this* call was
// the one that made the change. This is the guard against Stripe's webhook
// and the checkout success-page fallback both trying to fulfill the same
// payment — under the old node:sqlite adapter that race couldn't happen
// (queries were synchronous, so there was never a gap between "check status"
// and "write status" for two calls to interleave in), but a real async
// Postgres driver has exactly that gap, so the check-and-set has to happen
// as a single atomic statement instead of two separate calls from
// application code. See src/lib/checkout.ts's fulfillFoundationPayment.
export async function claimPaymentForFulfillment(
  id: string,
  stripePaymentIntentId?: string
): Promise<PaymentRow | undefined> {
  const row = await get<PaymentDbRow>(
    `UPDATE payments
     SET status = 'paid', stripe_payment_intent_id = COALESCE($intentId, stripe_payment_intent_id), updated_at = $now
     WHERE id = $id AND status != 'paid'
     RETURNING *`,
    { $id: id, $intentId: stripePaymentIntentId ?? null, $now: nowIso() }
  );
  return row ? fromRow(row) : undefined;
}
