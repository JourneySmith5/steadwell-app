"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { runReminderSweep, runDeletionSweep } from "@/lib/offboarding";
import { runMeetingReminderSweep } from "@/lib/meetingReminders";

// §16's reminder emails and hard-delete job need a real scheduled job in
// production (see scripts/offboarding-sweep.ts) — there's no cron
// infrastructure in this dev environment, same honest gap as SMTP (README).
// This button runs every daily sweep the real cron job would (offboarding
// reminders/deletions, plus the Accountability meeting-notes reminders —
// see src/lib/meetingReminders.ts) so Coach can see the whole flow work
// without waiting on a real scheduler to exist.
export async function runOffboardingSweepNow() {
  await requireOwner();
  await runReminderSweep();
  await runDeletionSweep();
  await runMeetingReminderSweep();
  redirect("/coach");
}
