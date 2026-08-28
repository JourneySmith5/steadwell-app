"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createSavings, updateSavings, deleteSavings, type SavingsInput } from "@/lib/repo/savings";
import { parseMoney, parseText, parseOptionalText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/savings";

function parseInput(formData: FormData): SavingsInput {
  return {
    name: parseText(formData, "name"),
    currentBalance: parseMoney(formData, "currentBalance"),
    purpose: parseOptionalText(formData, "purpose"),
  };
}

export async function addSavings(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.name) redirect(PATH);
  await createSavings(user.client.id, input);
  redirect(PATH);
}

export async function saveSavingsRow(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateSavings(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeSavings(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteSavings(String(formData.get("id") || ""));
  redirect(PATH);
}
