"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createHouseholdMember, updateHouseholdMember, deleteHouseholdMember } from "@/lib/repo/householdMembers";
import { parseText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/household";

export async function addHouseholdMember(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  const name = parseText(formData, "name");
  if (!name) redirect(PATH);
  await createHouseholdMember({
    clientId: user.client.id,
    name,
    relationship: parseText(formData, "relationship"),
    incomeIncluded: formData.get("incomeIncluded") === "on",
    expensesIncluded: formData.get("expensesIncluded") === "on",
  });
  redirect(PATH);
}

export async function saveHouseholdMember(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await updateHouseholdMember(String(formData.get("id") || ""), {
    name: parseText(formData, "name"),
    relationship: parseText(formData, "relationship"),
    incomeIncluded: formData.get("incomeIncluded") === "on",
    expensesIncluded: formData.get("expensesIncluded") === "on",
  });
  redirect(PATH);
}

export async function removeHouseholdMember(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await deleteHouseholdMember(String(formData.get("id") || ""));
  redirect(PATH);
}
