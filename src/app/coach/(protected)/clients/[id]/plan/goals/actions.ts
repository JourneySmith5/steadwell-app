"use server";

import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/dal";
import { listGoals } from "@/lib/repo/goals";
import { upsertGoalAllocation } from "@/lib/repo/allocationLines";
import { parseMoney } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/goals`;
}

export async function saveGoalAllocation(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);

  const goalId = String(formData.get("goalId") || "");
  const goal = (await listGoals(clientId)).find((g) => g.id === goalId);
  if (!goal) redirect(path(clientId));

  await upsertGoalAllocation(clientId, goalId, goal.name, parseMoney(formData, "plannedMonthly"));
  redirect(path(clientId));
}
