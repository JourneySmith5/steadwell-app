"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById, updatePlanBaseline } from "@/lib/repo/clients";
import { parseMoney, parseOptionalNotes } from "@/lib/formHelpers";

export async function saveBaseline(clientId: string, formData: FormData) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();
  await updatePlanBaseline(clientId, {
    historicalSpendingMonthly: parseMoney(formData, "historicalSpendingMonthly"),
    generalRationale: parseOptionalNotes(formData, "generalRationale"),
  });
  redirect(`/coach/clients/${clientId}/plan`);
}
