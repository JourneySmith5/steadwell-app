import { NextResponse } from "next/server";
import { requireClient } from "@/lib/dal";
import { buildDataExportPdf } from "@/lib/dataExport";
import { findOffboardingByClientId, markExported } from "@/lib/repo/offboarding";

export const runtime = "nodejs";

// §16 "provides an Export My Plan action" / §20 "Export action... only" —
// available any time during or after Offboarding. Downloading marks the
// offboarding record exported, which is what stops the weekly reminder
// emails (see src/lib/offboarding.ts's reminder sweep).
export async function GET() {
  const user = await requireClient();
  const client = user.client;
  if (!client) {
    return NextResponse.json({ error: "No client record found." }, { status: 404 });
  }

  const offboarding = await findOffboardingByClientId(client.id);
  if (!offboarding) {
    return NextResponse.json({ error: "Export is only available once your engagement has ended." }, { status: 404 });
  }

  const buffer = await buildDataExportPdf(client);
  await markExported(client.id);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="steadwell-export-${client.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
