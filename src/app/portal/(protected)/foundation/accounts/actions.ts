"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import {
  createFinancialAccount,
  updateFinancialAccount,
  deleteFinancialAccount,
  type FinancialAccountInput,
} from "@/lib/repo/financialAccounts";
import { parseMoney, parseText, parseOptionalText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/accounts";

function parseInput(formData: FormData): FinancialAccountInput {
  return {
    nickname: parseText(formData, "nickname"),
    type: parseText(formData, "type"),
    currentBalance: parseMoney(formData, "currentBalance", { allowNegative: true }),
    purpose: parseOptionalText(formData, "purpose"),
  };
}

export async function addFinancialAccount(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.nickname) redirect(PATH);
  await createFinancialAccount(user.client.id, input);
  redirect(PATH);
}

export async function saveFinancialAccount(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateFinancialAccount(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeFinancialAccount(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteFinancialAccount(String(formData.get("id") || ""));
  redirect(PATH);
}
