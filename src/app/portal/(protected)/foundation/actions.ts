"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { setClientStatus } from "@/lib/status";
import {
  getOrCreateFoundationIntake,
  updateAdditionalInfo,
  submitFoundationIntake,
  unlockFoundationIntake,
  isIntakeLocked,
} from "@/lib/repo/foundationIntake";
import { listGoals } from "@/lib/repo/goals";

// Autosave-by-design (§4): no confirmation UI needed, just persist and
// return to the hub. Locked once submitted, same as every section.
export async function saveAdditionalInfo(formData: FormData) {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  if (await isIntakeLocked(user.client.id)) redirect("/portal/foundation");
  await updateAdditionalInfo(user.client.id, String(formData.get("additionalInfo") || ""));
  redirect("/portal/foundation");
}

// §4 submission lock: submitting moves the record to "Foundation Intake —
// Submitted," which is what stops silent re-editing of already-reviewed
// facts (§12). At least one Financial Goal is required — same rule as the
// public application (§3), enforced again here since Foundation Intake is
// the record that actually matters. Failures round-trip through a query
// param rather than useActionState, keeping this whole feature server-only.
export async function submitIntake() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");

  const intake = await getOrCreateFoundationIntake(user.client.id);
  if (intake.status === "submitted") redirect("/portal/foundation");

  const goals = await listGoals(user.client.id);
  if (goals.length === 0) {
    redirect("/portal/foundation?error=" + encodeURIComponent("Add at least one Financial Goal before submitting."));
  }

  await submitFoundationIntake(user.client.id);
  await setClientStatus(user.client.id, "foundation_intake_submitted", "Client submitted Foundation Intake");
  redirect("/portal/foundation");
}

// Simplification from the full spec: this reopens the *whole* intake for
// editing, not just one section — see the comment on unlockFoundationIntake
// in src/lib/repo/foundationIntake.ts for why, and what per-section unlock
// would take to build.
export async function requestUpdate() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  await unlockFoundationIntake(user.client.id);
  await setClientStatus(
    user.client.id,
    "foundation_intake",
    "Client requested an update — whole intake reopened for editing (not per-section; see README)"
  );
  redirect("/portal/foundation");
}
