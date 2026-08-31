import { NextResponse } from "next/server";
import { requireClient } from "@/lib/dal";
import { generatePlanPdfBuffer } from "@/lib/planPdf";

export const runtime = "nodejs";

// §8: "clients get both a web-based version inside the portal and a
// downloadable PDF, generated at finalization time (...a point-in-time
// snapshot, not a live document)." The plan can't be edited after
// finalization, so generating it on request from that immutable data gives
// the same point-in-time-snapshot property as pre-generating and storing a
// file would — without needing binary storage for a snapshot that never
// changes. generatePlanPdfBuffer (src/lib/planPdf.ts) is shared with
// sendEmailDraft's attach-plan-pdf path (the Foundation Review completion
// email) so the plan reads identically however it's produced.
export async function GET() {
  const user = await requireClient();
  const client = user.client;
  if (!client || client.planStatus !== "active") {
    return NextResponse.json({ error: "No finalized plan available." }, { status: 404 });
  }

  const buffer = await generatePlanPdfBuffer(client);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="steadwell-plan-${client.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
