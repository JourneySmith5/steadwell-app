import "server-only";
import { findActiveDiscountCode } from "@/lib/repo/discountCodes";
import type { ClientRow } from "@/lib/repo/clients";

// THANKYOU15 and BIRTHDAY20 are conditional/automatic codes — nothing ever
// types them in (see the seed comment in schema.sql). Both still live as
// ordinary rows in discount_codes so Coach can flip them on/off and tune
// their percentage from the same Discount Codes settings page as every
// other code — this file is the one place that decides WHEN each one is
// actually eligible, keyed by looking up its exact code string. Renaming
// either row's code text would silently turn the automation off (the
// lookup just returns "not found" and the discount is skipped) rather than
// crash — a deliberate, graceful failure mode.

const THANKYOU15_WINDOW_MS = 24 * 60 * 60 * 1000;

// dateOfBirth is YYYY-MM-DD (an <input type="date"> value). Compares by
// calendar month only, in UTC — a discount whose boundary is "the right
// day, give or take a few hours around midnight in some timezone somewhere"
// isn't worth the complexity a real per-client timezone would add here.
export function isBirthMonth(dateOfBirth: string | null | undefined, now: Date): boolean {
  if (!dateOfBirth) return false;
  const month = Number(dateOfBirth.slice(5, 7));
  if (!Number.isFinite(month) || month < 1 || month > 12) return false;
  return now.getUTCMonth() + 1 === month;
}

// "20% off of any product for the month of their birthday" — eligible any
// time the client's date of birth falls in the current month, regardless
// of which product. Coach must also have BIRTHDAY20 enabled.
export async function getBirthday20Eligibility(
  client: Pick<ClientRow, "dateOfBirth"> | null | undefined,
  now: Date = new Date()
): Promise<{ eligible: boolean; percentOff: number }> {
  if (!client || !isBirthMonth(client.dateOfBirth, now)) return { eligible: false, percentOff: 0 };
  const code = await findActiveDiscountCode("BIRTHDAY20");
  if (!code) return { eligible: false, percentOff: 0 };
  return { eligible: true, percentOff: code.percentOff };
}

// "If they sign up for an accountability plan within 24 hours of
// completing their Foundations Plan review (triggered by sending a
// completion email with a copy of their plan)". foundationReviewEmailSentAt
// is set the moment Coach actually sends that email (not when drafted, not
// when the meeting is marked complete) — see clients.setFoundationReviewEmailSentAt.
export async function getThankYou15Eligibility(
  client: Pick<ClientRow, "foundationReviewEmailSentAt"> | null | undefined,
  now: Date = new Date()
): Promise<{ eligible: boolean; percentOff: number }> {
  if (!client?.foundationReviewEmailSentAt) return { eligible: false, percentOff: 0 };
  const sentAtMs = new Date(client.foundationReviewEmailSentAt).getTime();
  if (!Number.isFinite(sentAtMs) || now.getTime() - sentAtMs > THANKYOU15_WINDOW_MS) {
    return { eligible: false, percentOff: 0 };
  }
  const code = await findActiveDiscountCode("THANKYOU15");
  if (!code) return { eligible: false, percentOff: 0 };
  return { eligible: true, percentOff: code.percentOff };
}
