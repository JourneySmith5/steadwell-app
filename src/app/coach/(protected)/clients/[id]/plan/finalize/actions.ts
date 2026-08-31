"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { createActionItem, updateActionItem, deleteActionItem } from "@/lib/repo/actionItems";
import { markPlanReviewed, finalizePlan, presentPlan } from "@/lib/plan";
import type { ActionItemStatus } from "@/lib/enums";
import { parseOptionalMoney, parseNotes, parseOptionalText, parseOptionalNotes } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/finalize`;
}

async function assertClient(clientId: string) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();
}

export async function addActionItem(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const description = parseNotes(formData, "description");
  if (!description) redirect(path(clientId));
  await createActionItem(clientId, {
    description,
    amount: parseOptionalMoney(formData, "amount"),
    dueDate: parseOptionalText(formData, "dueDate"),
    status: (String(formData.get("status") || "not_started") as ActionItemStatus),
  });
  redirect(path(clientId));
}

export async function saveActionItem(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const id = String(formData.get("id") || "");
  await updateActionItem(id, {
    description: parseNotes(formData, "description"),
    amount: parseOptionalMoney(formData, "amount"),
    dueDate: parseOptionalText(formData, "dueDate"),
    status: (String(formData.get("status") || "not_started") as ActionItemStatus),
  });
  redirect(path(clientId));
}

export async function removeActionItem(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await deleteActionItem(String(formData.get("id") || ""));
  redirect(path(clientId));
}

export async function markReviewedAction(clientId: string) {
  await assertClient(clientId);
  await markPlanReviewed(clientId);
  redirect(path(clientId));
}

export async function finalizePlanAction(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const overrideNote = parseOptionalNotes(formData, "overrideNote");
  await finalizePlan(clientId, { overrideNote });
  redirect(path(clientId));
}

export async function presentPlanAction(clientId: string) {
  await assertClient(clientId);
  await presentPlan(clientId);
  redirect(`/coach/clients/${clientId}`);
}
