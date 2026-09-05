// Runs both Offboarding sweeps (§16) against the local database directly —
// no running server needed, same as scripts/seed.ts. This is what a real
// deployment would point a scheduled job at (e.g. a daily Vercel Cron hitting
// a route that calls these same two functions, protected by a secret). Until
// that's wired up, run this by hand or from your own cron:
//
//   npx tsx scripts/offboarding-sweep.ts
//
// Also reachable from the Coach Dashboard's "Run Sweep Now" button for
// manual/demo use — see src/app/coach/(protected)/actions.ts.

import { runReminderSweep, runDeletionSweep } from "../src/lib/offboarding";

async function main() {
  const reminders = await runReminderSweep();
  console.log(`Reminder sweep: sent ${reminders.sent}, skipped ${reminders.skipped}.`);

  const deletions = await runDeletionSweep();
  if (deletions.deleted.length === 0) {
    console.log("Deletion sweep: nothing past its 30-day mark.");
  } else {
    console.log(`Deletion sweep: hard-deleted ${deletions.deleted.length} client(s): ${deletions.deleted.join(", ")}`);
  }
  if (deletions.held.length > 0) {
    console.log(`Deletion sweep: skipped ${deletions.held.length} client(s) under litigation hold: ${deletions.held.join(", ")}`);
  }
  if (deletions.purgedPayments > 0) {
    console.log(`Payment retention purge: removed ${deletions.purgedPayments} record(s) past the 7-year mark.`);
  }
}

main().then(() => process.exit(0));
