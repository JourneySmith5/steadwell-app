"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { listGoals } from "@/lib/repo/goals";
import { upsertGoalAllocation } from "@/lib/repo/allocationLines";
import { parseMoney } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/goals`;
}

export async function saveGoalAllocation(clientId: string, formData: FormData) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();

  const goalId = String(formData.get("goalId") || "");
  const goal = (await listGoals(clientId)).find((g) => g.id === goalId);
  if (!goal) redirect(path(clientId));

  await upsertGoalAllocation(clientId, goalId, goal.name, parseMoney(formData, "plannedMonthly"));
  redirect(path(clientId));
}
