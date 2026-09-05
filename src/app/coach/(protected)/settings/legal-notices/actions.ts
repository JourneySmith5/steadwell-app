"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { parseNotes } from "@/lib/formHelpers";
import { publishLegalNotice, MINIMUM_NOTICE_DAYS } from "@/lib/legalNotices";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/enums";

function path() {
  return "/coach/settings/legal-notices";
}

// Owner-only (Agreement §14.2 / Terms §15) — this is the button that
// actually emails every currently-enrolled client, so it's gated the same
// way DeleteClientForm/RefundFoundationFeeForm gate their own irreversible
// actions: a typed confirmation on the client component (PublishNoticeForm)
// is the UI-courtesy friction, and the effective-date re-check here
// (inside publishLegalNotice) is the actual safety, never trusting that the
// page already hid the button for an invalid date.
export async function publishNotice(formData: FormData) {
  await requireOwner();

  const documentRaw = String(formData.get("document") ?? "");
  const document = (LEGAL_DOCUMENTS as readonly string[]).includes(documentRaw) ? (documentRaw as LegalDocument) : undefined;
  const summary = parseNotes(formData, "summary");
  const effectiveDate = String(formData.get("effectiveDate") ?? "").trim();
  const confirmed = String(formData.get("confirmPublish") ?? "").trim().toUpperCase();

  if (!document || !summary || !effectiveDate || confirmed !== "NOTIFY") {
    redirect(`${path()}?error=${encodeURIComponent("Fill in every field and type NOTIFY to confirm.")}`);
  }

  let notifiedCount: number;
  try {
    ({ notifiedCount } = await publishLegalNotice({ document, summary, effectiveDate }));
  } catch (err) {
    // publishLegalNotice's own error (an invalid effective date re-checked
    // server-side) — anything else is a real failure and should surface
    // normally rather than being swallowed into a generic redirect.
    if (err instanceof Error && err.message.includes("at least")) {
      redirect(`${path()}?error=${encodeURIComponent(`Effective date must be at least ${MINIMUM_NOTICE_DAYS} days from today.`)}`);
    }
    throw err;
  }
  redirect(`${path()}?published=${notifiedCount}`);
}
