import { run, get, newId, nowIso } from "@/lib/db/client";

// One row per "redeemed" meeting slot — see schema.sql's comment on
// meeting_redemptions for why this exists. Recorded the instant a client
// spends one of their Accountability package's monthly meetings, right
// before redeemMeetingSlot hands them off to Coach's external Google
// Calendar booking link.
export async function recordMeetingRedemption(clientId: string): Promise<void> {
  await run(`INSERT INTO meeting_redemptions (id, client_id, created_at) VALUES ($id, $clientId, $now)`, {
    $id: newId(),
    $clientId: clientId,
    $now: nowIso(),
  });
}

// Calendar-month window in UTC, compared as ISO-string text — same
// JS-computed-cutoff pattern as listStalePendingPayments in
// src/lib/repo/payments.ts. "This month" resets on the 1st regardless of
// when in the billing cycle the client enrolled; simplest reading of
// Journey's "the number of meetings in a month."
export async function countMeetingRedemptionsThisMonth(clientId: string, now: Date = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const row = await get<{ count: string }>(
    `SELECT COUNT(*) as count FROM meeting_redemptions WHERE client_id = $clientId AND created_at >= $monthStart`,
    { $clientId: clientId, $monthStart: monthStart }
  );
  return row ? Number(row.count) : 0;
}
