import "server-only";
import PDFDocument from "pdfkit";
import type { CoachInvoiceRow, CoachInvoiceItemRow } from "@/lib/repo/coachInvoices";
import type { UserRow } from "@/lib/repo/users";

const money = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A coach's downloadable 1099-commission invoice — what /coach/billing's
// "Download PDF" link and the owner's "Coach Invoices" oversight both serve
// (see src/app/api/coach-invoices/[id]/pdf/route.ts). Reuses the same
// pdfkit chunks/end pattern as buildDataExportPdf (src/lib/dataExport.ts) —
// no new dependency, this app already generates PDFs this way.
//
// "Bill From" is the coach (they're billing Steadwell for their cut, per
// Journey's framing: "for the 1099 coach to be able to conveniently bill
// Steadwell for their cut of proceeds from their clients"), not the other
// way around — this is the coach's own invoice to send, not a receipt
// Steadwell sends the coach.
export async function buildCoachInvoicePdf(
  invoice: CoachInvoiceRow,
  items: CoachInvoiceItemRow[],
  coach: UserRow
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(20).fillColor("#1f2d22").text("Commission Invoice");
  doc.fontSize(9).fillColor("#3f4a3f").moveDown(0.3).text(`Invoice ${invoice.id}`);
  doc.text(`Generated ${new Date(invoice.createdAt).toLocaleDateString()}`);
  doc.text(`Status: ${invoice.status === "paid" ? `Paid ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : ""}` : "Pending"}`);

  doc.moveDown(1);
  doc.fontSize(11).fillColor("#1f2d22").text("Bill From", { continued: false });
  doc.fontSize(10).fillColor("#3f4a3f").text(coach.fullName ?? coach.email);
  if (coach.fullName) doc.text(coach.email);

  doc.moveDown(0.6);
  doc.fontSize(11).fillColor("#1f2d22").text("Bill To");
  doc.fontSize(10).fillColor("#3f4a3f").text("Steadwell");

  doc.moveDown(0.6);
  doc.fontSize(10).fillColor("#3f4a3f").text(`Commission rate: ${invoice.commissionPercent}%`);

  const foundationItems = items.filter((i) => i.sourceType === "foundation");
  const accountabilityItems = items.filter((i) => i.sourceType === "accountability");

  const writeGroup = (title: string, groupItems: CoachInvoiceItemRow[], groupTotalCents: number) => {
    doc.moveDown(1).fontSize(13).fillColor("#1f2d22").text(title);
    if (groupItems.length === 0) {
      doc.fontSize(9).fillColor("#3f4a3f").text("None this invoice.");
      return;
    }
    doc.moveDown(0.2);
    for (const item of groupItems) {
      doc
        .fontSize(9)
        .fillColor("#3f4a3f")
        .text(
          `${new Date(item.paidAt).toLocaleDateString()} — ${item.clientFullName}   ` +
            `collected ${money(item.grossCents)}   your cut ${money(item.commissionCents)}`
        );
    }
    doc.moveDown(0.3).fontSize(10).fillColor("#1f2d22").text(`${title} subtotal: ${money(groupTotalCents)}`);
  };

  writeGroup("Foundation Fees", foundationItems, invoice.foundationCents);
  writeGroup("Accountability Payments", accountabilityItems, invoice.accountabilityCents);

  doc.moveDown(1.2).fontSize(14).fillColor("#1f2d22").text(`Total due: ${money(invoice.totalCents)}`);

  doc.end();
  return done;
}
