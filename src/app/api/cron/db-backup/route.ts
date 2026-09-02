import { NextResponse } from "next/server";
import { runAutomatedBackup } from "@/lib/backup";

export const runtime = "nodejs";

// Nightly off-site database backup — see src/lib/backup.ts for why this
// exists (short version: Supabase's Free plan takes no backups of its own).
// Auth follows the exact same shared-secret pattern as
// /api/cron/offboarding-sweep — see that route's comment for the full
// explanation of why (no logged-in user to check a session against) and how
// Vercel supplies the header automatically for scheduled invocations.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured on this deployment." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runAutomatedBackup();
  return NextResponse.json({ ...result, ranAt: new Date().toISOString() });
}
