"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { markCoachInvoicePaid } from "@/lib/repo/coachInvoices";

// Owner-only — flips a coach's invoice from Pending to Paid once they've
// actually sent the money outside the app (there's no in-app payout rail,
// per Journey's ask to just "track status" here). The coach's own
// /coach/billing page reads the same status.
export async function markCoachInvoicePaidAction(invoiceId: string) {
  await requireOwner();
  await markCoachInvoicePaid(invoiceId);
  redirect("/coach/reports");
}
