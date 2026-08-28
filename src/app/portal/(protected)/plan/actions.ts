"use server";

import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { setClientStatus } from "@/lib/status";

// Locked decision: right after the plan review meeting, the client sees an
// immediate choice — enroll in Accountability, or decline and start the
// 30-day export/deletion clock. No grace period; declining (or simply not
// enrolling) resolves to Graduated right away, which uniformly triggers
// offboarding (§16) same as Canceled/Closed.
export async function declineAccountability() {
  const user = await requireClient();
  if (!user.client) redirect("/portal");
  await setClientStatus(user.client.id, "graduated", "Client declined Accountability at plan presentation");
  redirect("/portal/account");
}
