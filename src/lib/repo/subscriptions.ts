import { get, all, run, newId, nowIso } from "@/lib/db/client";
import type { SubscriptionStatus } from "@/lib/enums";

interface SubscriptionDbRow {
  id: string;
  client_id: string;
  tier: string;
  status: string;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  birthday_discount_year_applied: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  clientId: string;
  tier: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  birthdayDiscountYearApplied: number | null;
  createdAt: string;
  updatedAt: string;
}

function fromRow(row: SubscriptionDbRow): SubscriptionRow {
  return {
    id: row.id,
    clientId: row.client_id,
    tier: row.tier,
    status: row.status as SubscriptionStatus,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end,
    birthdayDiscountYearApplied: row.birthday_discount_year_applied,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findSubscriptionByClientId(clientId: string): Promise<SubscriptionRow | undefined> {
  const row = await get<SubscriptionDbRow>("SELECT * FROM subscriptions WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

export async function findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionRow | undefined> {
  const row = await get<SubscriptionDbRow>("SELECT * FROM subscriptions WHERE stripe_subscription_id = $stripeId", {
    $stripeId: stripeSubscriptionId,
  });
  return row ? fromRow(row) : undefined;
}

// One subscription record per client (schema: client_id is UNIQUE) — the
// current Accountability enrollment, not a billing-cycle history (Stripe is
// the source of truth for that; see §9). Re-enrolling after a cancellation
// overwrites this same row rather than creating a new one.
export async function upsertSubscription(params: {
  clientId: string;
  tier: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}): Promise<SubscriptionRow> {
  const existing = await findSubscriptionByClientId(params.clientId);
  const now = nowIso();
  if (existing) {
    await run(
      `UPDATE subscriptions
       SET tier = $tier, status = $status, stripe_subscription_id = $stripeId, current_period_end = $periodEnd, updated_at = $now
       WHERE client_id = $clientId`,
      {
        $clientId: params.clientId,
        $tier: params.tier,
        $status: params.status,
        $stripeId: params.stripeSubscriptionId,
        $periodEnd: params.currentPeriodEnd,
        $now: now,
      }
    );
  } else {
    await run(
      `INSERT INTO subscriptions (id, client_id, tier, status, stripe_subscription_id, current_period_end, created_at, updated_at)
       VALUES ($id, $clientId, $tier, $status, $stripeId, $periodEnd, $now, $now)`,
      {
        $id: newId(),
        $clientId: params.clientId,
        $tier: params.tier,
        $status: params.status,
        $stripeId: params.stripeSubscriptionId,
        $periodEnd: params.currentPeriodEnd,
        $now: now,
      }
    );
  }
  return (await findSubscriptionByClientId(params.clientId))!;
}

export async function setSubscriptionStatus(clientId: string, status: SubscriptionStatus) {
  await run(`UPDATE subscriptions SET status = $status, updated_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $status: status,
    $now: nowIso(),
  });
}

export async function setSubscriptionTier(clientId: string, tier: string) {
  await run(`UPDATE subscriptions SET tier = $tier, updated_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $tier: tier,
    $now: nowIso(),
  });
}

// The calendar year (client's local concept of "this year") BIRTHDAY20 was
// last applied to this subscription's real Stripe billing — lets the daily
// sweep (src/lib/birthdayDiscount.ts) skip a client it already handled this
// year without re-deriving it from Stripe every run.
export async function setBirthdayDiscountYearApplied(clientId: string, year: number) {
  await run(`UPDATE subscriptions SET birthday_discount_year_applied = $year, updated_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $year: year,
    $now: nowIso(),
  });
}

// All currently-active Accountability subscriptions — the daily birthday
// sweep's candidate pool. Small table, no pagination needed at this scale
// (mirrors listActiveOffboardings' same assumption).
export async function listActiveSubscriptions(): Promise<SubscriptionRow[]> {
  const rows = await all<SubscriptionDbRow>("SELECT * FROM subscriptions WHERE status = 'active'");
  return rows.map(fromRow);
}
