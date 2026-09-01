import { NextResponse } from "next/server";
import { runReminderSweep, runDeletionSweep } from "@/lib/offboarding";
import { runBirthdayDiscountSweep } from "@/lib/birthdayDiscount";
import { runMeetingReminderSweep } from "@/lib/meetingReminders";

export const runtime = "nodejs";

// §16 Offboarding — the real scheduled-job path for runReminderSweep /
// runDeletionSweep, meant to run daily. The Coach Dashboard's "Run Sweep
// Now" button (src/app/coach/(protected)/actions.ts) calls the exact same
// two functions directly for manual/demo use — this route exists so a real
// scheduler can call them too, since nothing in local dev triggers them on
// a timer. See vercel.json, which points Vercel Cron at this path daily.
//
// §9 BIRTHDAY20's daily sweep (src/lib/birthdayDiscount.ts) rides along on
// this same daily job rather than getting its own Vercel Cron entry —
// there's no reason a second schedule slot is needed for another once-a-day
// check, and Vercel's free tier caps how many cron schedules a project can
// have. Its own "run now" button lives on the Discount Codes settings page
// instead of down here in Offboarding's, since that's the more relevant
// place for Coach to trigger it manually.
//
// The Accountability meeting-notes reminder sweep (src/lib/meetingReminders.ts)
// rides along here too, for the same reason — its manual "run now" trigger
// is folded into the Coach Dashboard's existing "Run Sweep Now" button
// rather than getting its own (see src/app/coach/(protected)/actions.ts).
//
// Protected by a shared secret rather than requireCoach()/session auth —
// Vercel Cron calls this with no user logged in, so the DAL's normal
// session-based checks don't apply here. Vercel automatically sends
// `Authorization: Bearer ${CRON_SECRET}` (using the exact env var name
// CRON_SECRET, read from the *hosting platform's* env vars, not the
// request) to every scheduled invocation — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
// If you deploy this outside Vercel, point whatever scheduler you use at
// this same URL with that same header.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured on this deployment." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reminders = await runReminderSweep();
  const deletions = await runDeletionSweep();
  const birthdayDiscounts = await runBirthdayDiscountSweep();
  const meetingReminders = await runMeetingReminderSweep();

  return NextResponse.json({ reminders, deletions, birthdayDiscounts, meetingReminders, ranAt: new Date().toISOString() });
}
