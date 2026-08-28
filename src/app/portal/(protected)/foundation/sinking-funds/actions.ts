"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import {
  createSinkingFund,
  updateSinkingFund,
  deleteSinkingFund,
  type SinkingFundInput,
} from "@/lib/repo/sinkingFunds";
import { parseMoney, parseText, parseOptionalNotes } from "@/lib/formHelpers";

const PATH = "/portal/foundation/sinking-funds";

function parseInput(formData: FormData): SinkingFundInput {
  return {
    name: parseText(formData, "name"),
    targetAmount: parseMoney(formData, "targetAmount"),
    currentBalance: parseMoney(formData, "currentBalance"),
    targetDate: parseText(formData, "targetDate"),
    notes: parseOptionalNotes(formData, "notes"),
  };
}

export async function addSinkingFund(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const input = parseInput(formData);
  if (!input.name) redirect(PATH);
  await createSinkingFund(user.client.id, input);
  redirect(PATH);
}

export async function saveSinkingFund(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateSinkingFund(String(formData.get("id") || ""), parseInput(formData));
  redirect(PATH);
}

export async function removeSinkingFund(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteSinkingFund(String(formData.get("id") || ""));
  redirect(PATH);
}
