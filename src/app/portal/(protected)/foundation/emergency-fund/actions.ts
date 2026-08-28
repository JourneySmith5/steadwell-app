"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { upsertEmergencyFund } from "@/lib/repo/emergencyFund";
import { parseMoney, parseOptionalText, parseOptionalNotes } from "@/lib/formHelpers";

const PATH = "/portal/foundation/emergency-fund";

export async function saveEmergencyFund(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect(PATH);
  await upsertEmergencyFund(user.client.id, {
    currentBalance: parseMoney(formData, "currentBalance"),
    target: parseMoney(formData, "target"),
    targetDate: parseOptionalText(formData, "targetDate"),
    notes: parseOptionalNotes(formData, "notes"),
  });
  redirect(PATH);
}
