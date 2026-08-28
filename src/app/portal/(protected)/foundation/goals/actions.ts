"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createGoal, updateGoal, deleteGoal, type GoalInput } from "@/lib/repo/goals";
import { parseMoney, parseText, parseOptionalText, parseOptionalNotes } from "@/lib/formHelpers";

const PATH = "/portal/foundation/goals";

function parseInput(formData: FormData): GoalInput {
  return {
    name: parseText(formData, "name"),
    target: parseMoney(formData, "target"),
    currentAmount: parseMoney(formData, "currentAmount"),
    hasDeadline: formData.get("hasDeadline") === "on",
    targetDate: parseOptionalText(formData, "targetDate"),
    priority: parseText(formData, "priority") || "Important",
    why: parseOptionalNotes(formData, "why"),
  };
}

export async function addGoal(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.name) redirect(PATH);
  await createGoal(user.client.id, input);
  redirect(PATH);
}

export async function saveGoal(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateGoal(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeGoal(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteGoal(String(formData.get("id") || ""));
  redirect(PATH);
}
