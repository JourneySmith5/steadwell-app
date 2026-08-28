"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createBill, updateBill, deleteBill, type BillInput } from "@/lib/repo/bills";
import { parseMoney, parseText, parseOptionalText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/bills";

function parseInput(formData: FormData): BillInput {
  return {
    name: parseText(formData, "name"),
    category: parseText(formData, "category"),
    amount: parseMoney(formData, "amount"),
    frequency: parseText(formData, "frequency") || "Monthly",
    dueDate: parseOptionalText(formData, "dueDate"),
    fixedOrVariable: parseText(formData, "fixedOrVariable") || "Fixed",
  };
}

export async function addBill(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.name) redirect(PATH);
  await createBill(user.client.id, input);
  redirect(PATH);
}

export async function saveBill(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateBill(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeBill(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteBill(String(formData.get("id") || ""));
  redirect(PATH);
}
