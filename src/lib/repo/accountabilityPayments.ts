import { run, all, newId, nowIso } from "@/lib/db/client";

export interface AccountabilityPaymentRow {
  id: string;
  clientId: string;
  subscriptionId: string;
  amountCents: number;
  stripeInvoiceId: string | null;
  paidAt: string;
  createdAt: string;
}

// The real record of Accountability revenue actually collected, one row
// per successful charge — see the schema.sql comment on this table for
// why it exists (this app otherwise has no invoice.paid/
// invoice.payment_succeeded handling, so no local history of recurring
// collections; see src/lib/repo/reports.ts's file header). Two callers:
// the real Stripe webhook (invoice.payment_succeeded, src/app/api/
// webhooks/stripe/route.ts) for every real renewal, and
// fulfillAccountabilityEnrollment (src/lib/accountability.ts) for the one
// test-mode row a local/demo enrollment can produce. Idempotent on
// stripeInvoiceId — ON CONFLICT DO NOTHING means a webhook retry (Stripe
// re-sends an event it didn't get a 200 for) can never double-record the
// same charge. Postgres treats multiple NULL stripe_invoice_id values as
// distinct, not conflicting, so this is a no-op guard only for real
// (non-null) Stripe invoice ids — exactly the case that needs it.
export async function recordAccountabilityPayment(params: {
  clientId: string;
  subscriptionId: string;
  amountCents: number;
  stripeInvoiceId: string | null;
  paidAt: string;
}): Promise<void> {
  await run(
    `INSERT INTO accountability_payments (id, client_id, subscription_id, amount_cents, stripe_invoice_id, paid_at, created_at)
     VALUES ($id, $clientId, $subscriptionId, $amountCents, $stripeInvoiceId, $paidAt, $now)
     ON CONFLICT (stripe_invoice_id) DO NOTHING`,
    {
      $id: newId(),
      $clientId: params.clientId,
      $subscriptionId: params.subscriptionId,
      $amountCents: params.amountCents,
      $stripeInvoiceId: params.stripeInvoiceId,
      $paidAt: params.paidAt,
      $now: nowIso(),
    }
  );
}

// Every real, collected Accountability payment for one coach's clients
// that hasn't already been folded into a coach invoice — the pool
// /coach/billing computes a coach's outstanding Accountability commission
// from, and what "Generate Invoice" actually bills against. The
// coach_invoice_items unique index on (source_type, source_id) is what
// makes the NOT EXISTS below a real guarantee, not just a convention — see
// schema.sql.
export interface UninvoicedAccountabilityItem {
  id: string;
  clientId: string;
  clientFullName: string;
  amountCents: number;
  paidAt: string;
}

export async function listUninvoicedAccountabilityForCoach(coachId: string): Promise<UninvoicedAccountabilityItem[]> {
  const rows = await all<{ id: string; client_id: string; client_full_name: string; amount_cents: number; paid_at: string }>(
    `SELECT ap.id, ap.client_id, c.full_name AS client_full_name, ap.amount_cents, ap.paid_at
     FROM accountability_payments ap
     JOIN clients c ON c.id = ap.client_id
     WHERE c.coach_id = $coachId
       AND NOT EXISTS (
         SELECT 1 FROM coach_invoice_items i WHERE i.source_type = 'accountability' AND i.source_id = ap.id
       )
     ORDER BY ap.paid_at ASC`,
    { $coachId: coachId }
  );
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientFullName: r.client_full_name,
    amountCents: r.amount_cents,
    paidAt: r.paid_at,
  }));
}
