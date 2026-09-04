"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { listUninvoicedFoundationForCoach } from "@/lib/repo/coachInvoices";
import { listUninvoicedAccountabilityForCoach } from "@/lib/repo/accountabilityPayments";
import { createCoachInvoice } from "@/lib/repo/coachInvoices";

const PATH = "/coach/billing";

function fail(message: string): never {
  redirect(PATH + "?error=" + encodeURIComponent(message));
}

// Snapshots every currently-uninvoiced Foundation fee and Accountability
// payment for the logged-in coach into one new coach_invoices row. Anyone
// coach-side can call this for themselves (requireCoach, not requireOwner)
// — it's the coach's own bill to Steadwell, not something the owner does on
// their behalf. Nothing to invoice, or no commission rate set, both fail
// with a clear message rather than silently generating an empty/zero
// invoice.
export async function generateInvoiceAction() {
  const user = await requireCoach();
  if (user.commissionPercent === null) {
    fail("You don't have a commission percentage set yet — ask the owner to set one on the Team page.");
  }

  const [foundationItems, accountabilityItems] = await Promise.all([
    listUninvoicedFoundationForCoach(user.id),
    listUninvoicedAccountabilityForCoach(user.id),
  ]);

  if (foundationItems.length === 0 && accountabilityItems.length === 0) {
    fail("Nothing to invoice — every collected payment has already been billed.");
  }

  await createCoachInvoice({
    coachId: user.id,
    commissionPercent: user.commissionPercent,
    foundationItems,
    accountabilityItems,
  });

  redirect(PATH);
}
