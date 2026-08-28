"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { runReminderSweep, runDeletionSweep } from "@/lib/offboarding";

// §16's reminder emails and hard-delete job need a real scheduled job in
// production (see scripts/offboarding-sweep.ts) — there's no cron
// infrastructure in this dev environment, same honest gap as SMTP (README).
// This button runs both sweeps on demand so Coach can see the whole flow
// work without waiting on a real scheduler to exist.
export async function runOffboardingSweepNow() {
  await requireCoach();
  await runReminderSweep();
  await runDeletionSweep();
  redirect("/coach");
}
