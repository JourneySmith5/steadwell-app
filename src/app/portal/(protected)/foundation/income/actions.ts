"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createIncomeSource, updateIncomeSource, deleteIncomeSource, type IncomeSourceInput } from "@/lib/repo/incomeSources";
import { parseMoney, parseOptionalMoney, parseText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/income";

function parseInput(formData: FormData): IncomeSourceInput {
  return {
    person: parseText(formData, "person"),
    sourceName: parseText(formData, "sourceName"),
    type: parseText(formData, "type"),
    takeHome: parseMoney(formData, "takeHome"),
    gross: parseOptionalMoney(formData, "gross"),
    frequency: parseText(formData, "frequency") || "Monthly",
    predictability: parseText(formData, "predictability") || "Consistent",
    variableTypical: parseOptionalMoney(formData, "variableTypical"),
    variableLow: parseOptionalMoney(formData, "variableLow"),
    variableHigh: parseOptionalMoney(formData, "variableHigh"),
  };
}

export async function addIncomeSource(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.sourceName) redirect(PATH);
  await createIncomeSource(user.client.id, input);
  redirect(PATH);
}

export async function saveIncomeSource(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateIncomeSource(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeIncomeSource(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteIncomeSource(String(formData.get("id") || ""));
  redirect(PATH);
}
