"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import {
  createFlexCategory,
  updateFlexCategory,
  deleteAllocationLine,
  upsertEmergencyAllocation,
  upsertSinkingFundAllocation,
  upsertGoalAllocation,
} from "@/lib/repo/allocationLines";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listDebts } from "@/lib/repo/debts";
import { findDebtDecisionByDebtId, upsertDebtDecision } from "@/lib/repo/debtDecisions";
import { listGoals } from "@/lib/repo/goals";
import { computePayoffTrajectory } from "@/lib/planCalc";
import { parseMoney, parseOptionalMoney, parseText } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/allocation`;
}

async function assertClient(clientId: string) {
  await requireClientAccess(clientId);
}

export async function addFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const category = parseText(formData, "category");
  if (!category) redirect(path(clientId));
  await createFlexCategory(clientId, {
    category,
    historicalAverage: parseOptionalMoney(formData, "historicalAverage"),
    plannedAmount: parseMoney(formData, "plannedAmount"),
  });
  redirect(path(clientId));
}

export async function saveFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const id = String(formData.get("id") || "");
  await updateFlexCategory(id, {
    category: parseText(formData, "category"),
    historicalAverage: parseOptionalMoney(formData, "historicalAverage"),
    plannedAmount: parseMoney(formData, "plannedAmount"),
  });
  redirect(path(clientId));
}

export async function removeFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await deleteAllocationLine(String(formData.get("id") || ""));
  redirect(path(clientId));
}

export async function saveEmergencyAllocation(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await upsertEmergencyAllocation(clientId, parseMoney(formData, "plannedAmount"));
  redirect(path(clientId));
}

export async function saveSinkingFundAllocation(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const sinkingFundId = String(formData.get("sinkingFundId") || "");
  const fund = (await listSinkingFunds(clientId)).find((f) => f.id === sinkingFundId);
  if (!fund) redirect(path(clientId));
  await upsertSinkingFundAllocation(clientId, sinkingFundId, fund.name, parseMoney(formData, "plannedAmount"));
  redirect(path(clientId));
}

// Quick-edit for the amount that actually feeds the Difference check —
// Priority/Strategy/Rationale (and the Coach-Only Insights) stay on the
// dedicated Debt Strategy page; this only touches Planned Payment so Coach
// can balance the plan without leaving the Allocation Workspace.
export async function saveDebtPlannedPayment(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const debtId = String(formData.get("debtId") || "");
  const debts = await listDebts(clientId);
  const debt = debts.find((d) => d.id === debtId);
  if (!debt) redirect(path(clientId));

  const plannedPayment = parseMoney(formData, "plannedPayment");
  const existing = await findDebtDecisionByDebtId(debtId);
  const trajectory = computePayoffTrajectory(debt.balance, debt.apr, plannedPayment);

  await upsertDebtDecision(clientId, debtId, {
    priority: existing?.priority ?? debts.findIndex((d) => d.id === debtId) + 1,
    plannedPayment,
    strategy: existing?.strategy ?? "Avalanche",
    rationale: existing?.rationale ?? null,
    monthsToPayoff: trajectory.monthsToPayoff,
    totalInterest: trajectory.totalInterest,
  });
  redirect(path(clientId));
}

// Same idea for Goals — Priority/Why/insights stay on the Savings & Goals
// page; this is just the planned monthly amount.
export async function saveGoalPlannedAmount(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const goalId = String(formData.get("goalId") || "");
  const goal = (await listGoals(clientId)).find((g) => g.id === goalId);
  if (!goal) redirect(path(clientId));
  await upsertGoalAllocation(clientId, goalId, goal.name, parseMoney(formData, "plannedMonthly"));
  redirect(path(clientId));
}
