"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { updatePlanBaseline } from "@/lib/repo/clients";
import { parseMoney, parseOptionalNotes } from "@/lib/formHelpers";

export async function saveBaseline(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);
  await updatePlanBaseline(clientId, {
    historicalSpendingMonthly: parseMoney(formData, "historicalSpendingMonthly"),
    generalRationale: parseOptionalNotes(formData, "generalRationale"),
  });
  redirect(`/coach/clients/${clientId}/plan`);
}
