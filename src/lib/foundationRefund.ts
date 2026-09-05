// Foundation fee refund eligibility (Agreement §5.3.1, post legal-review
// revision — supersedes the earlier "refundable until Client submits their
// Foundation Intake" rule). Per Journey's confirmation, the cutoff is now
// tied to the COACH delivering the Foundation Intake SESSION (a completed
// "Foundation"-type meeting on this client's record), not the client
// submitting the Foundation Intake form — those are two different things in
// this app (the form is client-facing data entry under Foundation Intake;
// the session is a coach-logged meeting, see src/lib/repo/meetings.ts).
//
// Single source of truth for both the owner-only refund action's
// server-side guard (src/app/coach/(protected)/clients/[id]/actions.ts) and
// the Client Detail page's UI gate, so they can't drift apart — same
// pattern as the retired FOUNDATION_REFUND_ELIGIBLE_STATUSES list.
import type { ClientStatus } from "@/lib/enums";
import type { MeetingRow } from "@/lib/repo/meetings";

// A client already fully wound down shouldn't be reopened for a refund via
// this path — Canceled already runs its own refund-or-not decision at the
// time it happens, and Closed/Graduated/Declined are terminal for other
// reasons entirely unrelated to the Foundation fee.
const TERMINAL_STATUSES: ClientStatus[] = ["canceled", "closed", "graduated", "declined"];

export function hasDeliveredFoundationSession(meetings: MeetingRow[]): boolean {
  return meetings.some((m) => m.type === "Foundation" && m.status === "completed");
}

export function isFoundationFeeRefundEligible(clientStatus: ClientStatus, meetings: MeetingRow[]): boolean {
  return !TERMINAL_STATUSES.includes(clientStatus) && !hasDeliveredFoundationSession(meetings);
}

export function daysSince(isoDate: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000));
}

// Agreement §5.3.1: "If Coach fails to deliver the Foundation Intake
// session within thirty (30) days of payment for any reason other than
// Client's unavailability, Client may request a full refund." Software
// can't judge the "other than Client's unavailability" carve-out on its
// own, so this only ever *surfaces* the client's right (coach + portal
// views) — the actual refund still goes through the owner-only action
// above, same as every other refund in this app.
export const FOUNDATION_NON_DELIVERY_REFUND_DAYS = 30;

export function isFoundationNonDeliveryRefundEligible(
  foundationPaymentCreatedAt: string,
  meetings: MeetingRow[],
  now: Date = new Date()
): boolean {
  return !hasDeliveredFoundationSession(meetings) && daysSince(foundationPaymentCreatedAt, now) >= FOUNDATION_NON_DELIVERY_REFUND_DAYS;
}
