import { run, get, all, newId, nowIso, withTransaction } from "@/lib/db/client";

// The Foundation-fee counterpart to listUninvoicedAccountabilityForCoach
// (src/lib/repo/accountabilityPayments.ts) — payments.status = 'paid' is
// already the real "money actually collected" signal for a one-time
// Foundation fee (no separate ledger table needed, unlike Accountability,
// which can renew — see that file's header comment for why one exists
// there and not here).
export interface UninvoicedFoundationItem {
  id: string;
  clientId: string;
  clientFullName: string;
  amountCents: number;
  paidAt: string;
}

export async function listUninvoicedFoundationForCoach(coachId: string): Promise<UninvoicedFoundationItem[]> {
  const rows = await all<{ id: string; client_id: string; client_full_name: string; amount_cents: number; updated_at: string }>(
    `SELECT p.id, p.client_id, c.full_name AS client_full_name, p.amount_cents, p.updated_at
     FROM payments p
     JOIN clients c ON c.id = p.client_id
     WHERE c.coach_id = $coachId
       AND p.type = 'foundation'
       AND p.status = 'paid'
       AND NOT EXISTS (
         SELECT 1 FROM coach_invoice_items i WHERE i.source_type = 'foundation' AND i.source_id = p.id
       )
     ORDER BY p.updated_at ASC`,
    { $coachId: coachId }
  );
  // payments has no separate "paid_at" column — updated_at is the moment
  // markPaymentStatus/claimPaymentForFulfillment flipped it to 'paid' (see
  // src/lib/repo/payments.ts), which is exactly the collection moment an
  // invoice line item needs.
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientFullName: r.client_full_name,
    amountCents: r.amount_cents,
    paidAt: r.updated_at,
  }));
}

export type CoachInvoiceStatus = "pending" | "paid";

export interface CoachInvoiceRow {
  id: string;
  coachId: string;
  commissionPercent: number;
  foundationCents: number;
  accountabilityCents: number;
  totalCents: number;
  status: CoachInvoiceStatus;
  paidAt: string | null;
  createdAt: string;
}

interface CoachInvoiceDbRow {
  id: string;
  coach_id: string;
  commission_percent: number;
  foundation_cents: number;
  accountability_cents: number;
  total_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function fromRow(row: CoachInvoiceDbRow): CoachInvoiceRow {
  return {
    id: row.id,
    coachId: row.coach_id,
    commissionPercent: row.commission_percent,
    foundationCents: row.foundation_cents,
    accountabilityCents: row.accountability_cents,
    totalCents: row.total_cents,
    status: row.status as CoachInvoiceStatus,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export type CoachInvoiceSourceType = "foundation" | "accountability";

export interface CoachInvoiceItemRow {
  id: string;
  coachInvoiceId: string;
  sourceType: CoachInvoiceSourceType;
  sourceId: string;
  clientId: string;
  clientFullName: string;
  grossCents: number;
  commissionCents: number;
  paidAt: string;
}

interface CoachInvoiceItemDbRow {
  id: string;
  coach_invoice_id: string;
  source_type: string;
  source_id: string;
  client_id: string;
  client_full_name: string;
  gross_cents: number;
  commission_cents: number;
  paid_at: string;
}

function itemFromRow(row: CoachInvoiceItemDbRow): CoachInvoiceItemRow {
  return {
    id: row.id,
    coachInvoiceId: row.coach_invoice_id,
    sourceType: row.source_type as CoachInvoiceSourceType,
    sourceId: row.source_id,
    clientId: row.client_id,
    clientFullName: row.client_full_name,
    grossCents: row.gross_cents,
    commissionCents: row.commission_cents,
    paidAt: row.paid_at,
  };
}

// The one place a coach's uninvoiced Foundation + Accountability collections
// turn into a real coach_invoices row — called by the coach's own "Generate
// Invoice" action (src/app/coach/(protected)/billing/actions.ts). Wrapped in
// withTransaction so a failure partway through (e.g. mid-insert) can't leave
// a half-written invoice with some items recorded and others not — every
// coach_invoice_items row this creates is what permanently excludes that
// payment from ever being invoiced again (see the UNIQUE index in
// schema.sql), so a partial write here would either double-bill or
// permanently lose a payment from ever being billable.
export async function createCoachInvoice(params: {
  coachId: string;
  commissionPercent: number;
  foundationItems: { id: string; clientId: string; amountCents: number; paidAt: string }[];
  accountabilityItems: { id: string; clientId: string; amountCents: number; paidAt: string }[];
}): Promise<CoachInvoiceRow> {
  return withTransaction(async () => {
    const round = (cents: number) => Math.round((cents * params.commissionPercent) / 100);

    const foundationCommission = params.foundationItems.reduce((sum, it) => sum + round(it.amountCents), 0);
    const accountabilityCommission = params.accountabilityItems.reduce((sum, it) => sum + round(it.amountCents), 0);
    const foundationCents = foundationCommission;
    const accountabilityCents = accountabilityCommission;
    const totalCents = foundationCents + accountabilityCents;

    const invoiceId = newId();
    const now = nowIso();
    await run(
      `INSERT INTO coach_invoices (id, coach_id, commission_percent, foundation_cents, accountability_cents, total_cents, status, paid_at, created_at)
       VALUES ($id, $coachId, $commissionPercent, $foundationCents, $accountabilityCents, $totalCents, 'pending', NULL, $now)`,
      {
        $id: invoiceId,
        $coachId: params.coachId,
        $commissionPercent: params.commissionPercent,
        $foundationCents: foundationCents,
        $accountabilityCents: accountabilityCents,
        $totalCents: totalCents,
        $now: now,
      }
    );

    for (const it of params.foundationItems) {
      await run(
        `INSERT INTO coach_invoice_items (id, coach_invoice_id, source_type, source_id, client_id, gross_cents, commission_cents, paid_at, created_at)
         VALUES ($id, $invoiceId, 'foundation', $sourceId, $clientId, $grossCents, $commissionCents, $paidAt, $now)`,
        {
          $id: newId(),
          $invoiceId: invoiceId,
          $sourceId: it.id,
          $clientId: it.clientId,
          $grossCents: it.amountCents,
          $commissionCents: round(it.amountCents),
          $paidAt: it.paidAt,
          $now: now,
        }
      );
    }

    for (const it of params.accountabilityItems) {
      await run(
        `INSERT INTO coach_invoice_items (id, coach_invoice_id, source_type, source_id, client_id, gross_cents, commission_cents, paid_at, created_at)
         VALUES ($id, $invoiceId, 'accountability', $sourceId, $clientId, $grossCents, $commissionCents, $paidAt, $now)`,
        {
          $id: newId(),
          $invoiceId: invoiceId,
          $sourceId: it.id,
          $clientId: it.clientId,
          $grossCents: it.amountCents,
          $commissionCents: round(it.amountCents),
          $paidAt: it.paidAt,
          $now: now,
        }
      );
    }

    return (await findCoachInvoiceById(invoiceId))!;
  });
}

export async function findCoachInvoiceById(id: string): Promise<CoachInvoiceRow | undefined> {
  const row = await get<CoachInvoiceDbRow>("SELECT * FROM coach_invoices WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function listItemsForCoachInvoice(coachInvoiceId: string): Promise<CoachInvoiceItemRow[]> {
  const rows = await all<CoachInvoiceItemDbRow>(
    `SELECT i.*, c.full_name AS client_full_name
     FROM coach_invoice_items i
     JOIN clients c ON c.id = i.client_id
     WHERE i.coach_invoice_id = $coachInvoiceId
     ORDER BY i.paid_at ASC`,
    { $coachInvoiceId: coachInvoiceId }
  );
  return rows.map(itemFromRow);
}

// A coach's own invoice history (self-service /coach/billing).
export async function listInvoicesForCoach(coachId: string): Promise<CoachInvoiceRow[]> {
  const rows = await all<CoachInvoiceDbRow>(
    "SELECT * FROM coach_invoices WHERE coach_id = $coachId ORDER BY created_at DESC",
    { $coachId: coachId }
  );
  return rows.map(fromRow);
}

// Owner oversight — every coach's invoices, for the "Coach Invoices" section
// on /coach/reports.
export async function listAllCoachInvoices(): Promise<(CoachInvoiceRow & { coachFullName: string; coachEmail: string })[]> {
  const rows = await all<CoachInvoiceDbRow & { coach_full_name: string | null; coach_email: string }>(
    `SELECT ci.*, u.full_name AS coach_full_name, u.email AS coach_email
     FROM coach_invoices ci
     JOIN users u ON u.id = ci.coach_id
     ORDER BY ci.created_at DESC`
  );
  return rows.map((r) => ({ ...fromRow(r), coachFullName: r.coach_full_name ?? r.coach_email, coachEmail: r.coach_email }));
}

export async function markCoachInvoicePaid(id: string): Promise<void> {
  await run(`UPDATE coach_invoices SET status = 'paid', paid_at = $now WHERE id = $id`, { $id: id, $now: nowIso() });
}
