import { get, all } from "@/lib/db/client";
import { ACCOUNTABILITY_TIERS, FOUNDATION_FEE_CENTS } from "@/lib/enums";

// Owner-only Revenue Reports page (src/app/coach/(protected)/reports/page.tsx)
// — read-only aggregate queries, kept separate from the per-entity CRUD
// repos (payments.ts, subscriptions.ts) since these join across tables and
// exist only to feed that one page.
//
// Important scope note, honestly documented rather than silently
// overclaimed: `payments` only ever gets a row for the one-time $399
// Foundation fee (type: "foundation" — see src/lib/checkout.ts). Recurring
// Accountability subscription charges are billed and collected by Stripe
// directly; this app never receives (and doesn't currently handle) an
// `invoice.paid` webhook, so there's no local record of what Stripe has
// actually collected on a subscription over time — see the "Real Stripe
// Prices are created ad hoc" comment in src/lib/accountability.ts. So
// "Total revenue collected" below means Foundation fees only, and
// Accountability is reported instead as *current* MRR (a live projection
// from active subscriptions × tier price), not money already collected.
// A real production build would add invoice.paid handling to make
// Accountability collections show up here too.

export interface RevenueTotals {
  allTimeCents: number;
  monthToDateCents: number;
  paidCount: number;
}

export async function getFoundationRevenueTotals(): Promise<RevenueTotals> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const allTime = await get<{ total: string | null; count: string | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM payments WHERE status = 'paid'`
  );
  const monthToDate = await get<{ total: string | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payments WHERE status = 'paid' AND created_at >= $start`,
    { $start: monthStart.toISOString() }
  );

  return {
    allTimeCents: Number(allTime?.total ?? 0),
    monthToDateCents: Number(monthToDate?.total ?? 0),
    paidCount: Number(allTime?.count ?? 0),
  };
}

export interface TierMrr {
  tierId: string;
  label: string;
  activeCount: number;
  mrrCents: number;
}

export interface MrrSummary {
  byTier: TierMrr[];
  totalActiveCount: number;
  totalMrrCents: number;
}

export async function getActiveSubscriptionsMrr(): Promise<MrrSummary> {
  const rows = await all<{ tier: string; count: string }>(
    `SELECT tier, COUNT(*) AS count FROM subscriptions WHERE status = 'active' GROUP BY tier`
  );
  const countByTier = new Map(rows.map((r) => [r.tier, Number(r.count)]));

  const byTier: TierMrr[] = ACCOUNTABILITY_TIERS.map((t) => {
    const activeCount = countByTier.get(t.id) ?? 0;
    return { tierId: t.id, label: t.label, activeCount, mrrCents: activeCount * t.priceCents };
  });

  // Any active subscription on a tier id that no longer matches
  // ACCOUNTABILITY_TIERS (a tier renamed/removed since the subscription was
  // created) wouldn't be priceable — none exist today, but summing byTier
  // rather than re-querying keeps the total consistent with what's shown.
  const totalActiveCount = byTier.reduce((sum, t) => sum + t.activeCount, 0);
  const totalMrrCents = byTier.reduce((sum, t) => sum + t.mrrCents, 0);

  return { byTier, totalActiveCount, totalMrrCents };
}

export interface CoachRevenueRow {
  coachId: string | null;
  foundationCollectedCents: number;
  foundationPaidCount: number;
  activeSubscriptionCount: number;
  mrrCents: number;
}

// Keyed by coach_id (null = unassigned) — the page merges this against
// listCoachSideUsers() so every current coach/owner shows up even at $0,
// rather than only coaches who happen to already have revenue.
export async function getRevenueByCoach(): Promise<CoachRevenueRow[]> {
  const paymentRows = await all<{ coach_id: string | null; total: string; count: string }>(
    `SELECT c.coach_id AS coach_id, COALESCE(SUM(p.amount_cents), 0) AS total, COUNT(p.id) AS count
     FROM payments p
     JOIN clients c ON c.id = p.client_id
     WHERE p.status = 'paid'
     GROUP BY c.coach_id`
  );
  const subscriptionRows = await all<{ coach_id: string | null; tier: string; count: string }>(
    `SELECT c.coach_id AS coach_id, s.tier AS tier, COUNT(*) AS count
     FROM subscriptions s
     JOIN clients c ON c.id = s.client_id
     WHERE s.status = 'active'
     GROUP BY c.coach_id, s.tier`
  );
  const tierPriceById = new Map<string, number>(ACCOUNTABILITY_TIERS.map((t) => [t.id, t.priceCents]));

  const byCoach = new Map<string | null, CoachRevenueRow>();
  const rowFor = (coachId: string | null): CoachRevenueRow => {
    let row = byCoach.get(coachId);
    if (!row) {
      row = { coachId, foundationCollectedCents: 0, foundationPaidCount: 0, activeSubscriptionCount: 0, mrrCents: 0 };
      byCoach.set(coachId, row);
    }
    return row;
  };

  for (const r of paymentRows) {
    const row = rowFor(r.coach_id);
    row.foundationCollectedCents = Number(r.total);
    row.foundationPaidCount = Number(r.count);
  }
  for (const r of subscriptionRows) {
    const row = rowFor(r.coach_id);
    const count = Number(r.count);
    row.activeSubscriptionCount += count;
    row.mrrCents += count * (tierPriceById.get(r.tier) ?? 0);
  }

  return [...byCoach.values()];
}

export interface DiscountCodeImpactRow {
  discountCode: string;
  redemptionCount: number;
  collectedCents: number;
  // Estimated against FOUNDATION_FEE_CENTS since "foundation" is currently
  // the only payment type that ever carries a discount_code (see the file
  // header note) — this would need to broaden if that ever changes.
  estimatedGivenUpCents: number;
}

export async function getDiscountCodeImpact(): Promise<DiscountCodeImpactRow[]> {
  const rows = await all<{ discount_code: string; count: string; total: string }>(
    `SELECT discount_code, COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total
     FROM payments
     WHERE status = 'paid' AND discount_code IS NOT NULL AND type = 'foundation'
     GROUP BY discount_code
     ORDER BY count DESC`
  );
  return rows.map((r) => {
    const count = Number(r.count);
    const collected = Number(r.total);
    return {
      discountCode: r.discount_code,
      redemptionCount: count,
      collectedCents: collected,
      estimatedGivenUpCents: Math.max(0, count * FOUNDATION_FEE_CENTS - collected),
    };
  });
}
