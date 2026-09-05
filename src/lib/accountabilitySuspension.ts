import { daysSince } from "@/lib/foundationRefund";

// Agreement §5.5: "If a scheduled Accountability Track payment fails, Coach
// may suspend services until payment is received. If payment is not
// received within fifteen (15) days of the failed charge, Coach may
// terminate the Accountability Track and the data retention provisions of
// Section 8 will apply." Both actions are Coach's discretion ("may"), never
// automatic — this file is just the eligibility math the Coach-facing UI
// and the terminate action both re-check server-side, the same pattern
// src/lib/foundationRefund.ts established for the Foundation fee's own
// discretionary cutoff.
export const ACCOUNTABILITY_TERMINATION_DAYS = 15;

// Reuses foundationRefund's daysSince rather than duplicating the same
// one-line date-math helper.
export function daysPastDue(pastDueSince: string | null, now: Date = new Date()): number | null {
  if (!pastDueSince) return null;
  return daysSince(pastDueSince, now);
}

// True once at least 15 days have passed since the current past-due streak
// began (subscriptions.past_due_since) — the earliest point at which the
// Agreement allows Coach to terminate rather than merely suspend. Coach
// still has to actually choose to terminate; this only says the option is
// available, mirroring isFoundationFeeRefundEligible's "eligible, not
// automatic" shape.
export function isAccountabilityTerminationEligible(pastDueSince: string | null, now: Date = new Date()): boolean {
  const days = daysPastDue(pastDueSince, now);
  return days !== null && days >= ACCOUNTABILITY_TERMINATION_DAYS;
}
