import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/dal";
import { buildFullBackup } from "@/lib/backup";

// Route Handlers aren't wrapped by their segment's layout (only pages are),
// so the auth check has to happen explicitly here — same pattern as
// /portal/plan/pdf and /portal/export.
export const runtime = "nodejs";

export async function GET() {
  await requireCoach();
  const backup = await buildFullBackup();
  const json = JSON.stringify(backup, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="steadwell-backup-${stamp}.json"`,
    },
  });
}
