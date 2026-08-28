"use server";

import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import {
  createFlexCategory,
  updateFlexCategory,
  deleteAllocationLine,
  upsertEmergencyAllocation,
  upsertSinkingFundAllocation,
} from "@/lib/repo/allocationLines";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { parseMoney, parseOptionalMoney, parseText } from "@/lib/formHelpers";

function path(clientId: string) {
  return `/coach/clients/${clientId}/plan/allocation`;
}

async function assertClient(clientId: string) {
  await requireCoach();
  if (!(await findClientById(clientId))) notFound();
}

export async function addFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const category = parseText(formData, "category");
  if (!category) redirect(path(clientId));
  await createFlexCategory(clientId, {
    category,
    historicalAverage: parseOptionalMoney(formData, "historicalAverage"),
    plannedAmount: parseMoney(formData, "plannedAmount"),
  });
  redirect(path(clientId));
}

export async function saveFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const id = String(formData.get("id") || "");
  await updateFlexCategory(id, {
    category: parseText(formData, "category"),
    historicalAverage: parseOptionalMoney(formData, "historicalAverage"),
    plannedAmount: parseMoney(formData, "plannedAmount"),
  });
  redirect(path(clientId));
}

export async function removeFlexCategory(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await deleteAllocationLine(String(formData.get("id") || ""));
  redirect(path(clientId));
}

export async function saveEmergencyAllocation(clientId: string, formData: FormData) {
  await assertClient(clientId);
  await upsertEmergencyAllocation(clientId, parseMoney(formData, "plannedAmount"));
  redirect(path(clientId));
}

export async function saveSinkingFundAllocation(clientId: string, formData: FormData) {
  await assertClient(clientId);
  const sinkingFundId = String(formData.get("sinkingFundId") || "");
  const fund = (await listSinkingFunds(clientId)).find((f) => f.id === sinkingFundId);
  if (!fund) redirect(path(clientId));
  await upsertSinkingFundAllocation(clientId, sinkingFundId, fund.name, parseMoney(formData, "plannedAmount"));
  redirect(path(clientId));
}
