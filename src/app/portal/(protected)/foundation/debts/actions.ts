"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createDebt, updateDebt, deleteDebt, type DebtInput } from "@/lib/repo/debts";
import { parseMoney, parseOptionalMoney, parseText, parseOptionalText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/debts";

function parseInput(formData: FormData): DebtInput {
  return {
    creditor: parseText(formData, "creditor"),
    type: parseText(formData, "type"),
    balance: parseMoney(formData, "balance"),
    apr: parseMoney(formData, "apr"),
    minimumPayment: parseMoney(formData, "minimumPayment"),
    dueDate: parseOptionalText(formData, "dueDate"),
    promoRate: parseOptionalMoney(formData, "promoRate"),
    promoExpiresAt: parseOptionalText(formData, "promoExpiresAt"),
  };
}

export async function addDebt(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.creditor) redirect(PATH);
  await createDebt(user.client.id, input);
  redirect(PATH);
}

export async function saveDebt(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateDebt(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeDebt(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteDebt(String(formData.get("id") || ""));
  redirect(PATH);
}
