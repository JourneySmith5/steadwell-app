import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/dal";
import { buildFullBackup } from "@/lib/backup";

// Route Handlers aren't wrapped by their segment's layout (only pages are),
// so the auth check has to happen explicitly here — same pattern as
// /portal/plan/pdf and /portal/export. Owner-only: this dumps the entire
// database, every client's data, not just a hired coach's own roster.
export const runtime = "nodejs";

export async function GET() {
  await requireOwner();
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
