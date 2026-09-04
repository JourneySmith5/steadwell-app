import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/dal";
import { findCoachInvoiceById, listItemsForCoachInvoice } from "@/lib/repo/coachInvoices";
import { findUserById } from "@/lib/repo/users";
import { buildCoachInvoicePdf } from "@/lib/coachInvoicePdf";

export const runtime = "nodejs";

// Serves one coach invoice as a downloadable PDF — linked from both the
// coach's own /coach/billing history and the owner's "Coach Invoices"
// oversight section on /coach/reports. Ownership check mirrors
// requireClientAccess (src/lib/dal.ts): the owner can reach any invoice, a
// hired coach only their own — notFound() rather than a 403 so a coach
// probing another coach's invoice ids can't even tell whether the id
// exists, same reasoning as requireClientAccess.
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireCoach();

  const invoice = await findCoachInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (user.role !== "owner" && invoice.coachId !== user.id) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const coach = await findUserById(invoice.coachId);
  if (!coach) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }

  const items = await listItemsForCoachInvoice(invoice.id);
  const buffer = await buildCoachInvoicePdf(invoice, items, coach);

  const namePart = (coach.fullName ?? coach.email).replace(/\s+/g, "-").toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="steadwell-invoice-${namePart}-${invoice.createdAt.slice(0, 10)}.pdf"`,
    },
  });
}
