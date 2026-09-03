"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { listDebts } from "@/lib/repo/debts";
import { upsertDebtDecision } from "@/lib/repo/debtDecisions";
import { computePayoffTrajectory } from "@/lib/planCalc";
import { parseMoney, parseText, parseOptionalNotes } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/debts`;
}

export async function saveDebtDecision(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);

  const debtId = String(formData.get("debtId") || "");
  const debt = (await listDebts(clientId)).find((d) => d.id === debtId);
  if (!debt) redirect(path(clientId));

  const priority = parseMoney(formData, "priority", { fallback: 1 });
  const plannedPayment = parseMoney(formData, "plannedPayment");
  const strategy = parseText(formData, "strategy") || "Avalanche";
  const rationale = parseOptionalNotes(formData, "rationale");

  const trajectory = computePayoffTrajectory(debt.balance, debt.apr, plannedPayment);

  await upsertDebtDecision(clientId, debtId, {
    priority,
    plannedPayment,
    strategy,
    rationale,
    monthsToPayoff: trajectory.monthsToPayoff,
    totalInterest: trajectory.totalInterest,
  });
  redirect(path(clientId));
}
