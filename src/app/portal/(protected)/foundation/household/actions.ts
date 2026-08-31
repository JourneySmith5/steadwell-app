"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { createHouseholdMember, updateHouseholdMember, deleteHouseholdMember } from "@/lib/repo/householdMembers";
import { setDateOfBirth } from "@/lib/repo/clients";
import { parseText, parseOptionalText } from "@/lib/formHelpers";

const PATH = "/portal/foundation/household";

// YYYY-MM-DD, matching an <input type="date"> value — loose on purpose
// (doesn't validate real calendar dates like Feb 30) since this only feeds
// a "which month is their birthday" check, not anything that needs a real
// Date object to be exact.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveDateOfBirth(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  const raw = parseOptionalText(formData, "dateOfBirth", { maxLength: 10 });
  await setDateOfBirth(user.client.id, raw && DATE_RE.test(raw) ? raw : null);
  redirect(PATH);
}

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
