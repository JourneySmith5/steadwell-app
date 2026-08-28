import { NextResponse } from "next/server";
import { runReminderSweep, runDeletionSweep } from "@/lib/offboarding";

export const runtime = "nodejs";

// §16 Offboarding — the real scheduled-job path for runReminderSweep /
// runDeletionSweep, meant to run daily. The Coach Dashboard's "Run Sweep
// Now" button (src/app/coach/(protected)/actions.ts) calls the exact same
// two functions directly for manual/demo use — this route exists so a real
// scheduler can call them too, since nothing in local dev triggers them on
// a timer. See vercel.json, which points Vercel Cron at this path daily.
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

  return NextResponse.json({ reminders, deletions, ranAt: new Date().toISOString() });
}
