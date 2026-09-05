import "server-only";
import { listClients } from "@/lib/repo/clients";
import { OFFBOARDING_TRIGGER_STATUSES, type LegalDocument, LEGAL_DOCUMENT_LABELS } from "@/lib/enums";
import { insertLegalNotice, setLegalNoticeNotifiedCount } from "@/lib/repo/legalNotices";
import { sendSystemEmail, legalDocumentChangeTemplate } from "@/lib/email";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, AGREEMENT_URL } from "@/lib/agreementContent";

// Agreement §14.2 / Terms §15: a material change to the Agreement, Privacy
// Policy, or Terms has to be published to existing clients "at least thirty
// (30) days" before it takes effect, via the Platform, email, or both. This
// is the mechanism that publishes one — an owner-triggered broadcast (see
// the /coach/settings/legal-notices page) that both records the notice
// (legal_notices table) and emails every currently-enrolled client, plus a
// Portal banner (src/app/portal/(protected)/page.tsx) for as long as the
// effective date is still in the future.
//
// Scope: this is the NOTICE mechanism, not a document-versioning system.
// It doesn't rewrite agreementContent.ts/privacyContent.ts/termsContent.ts
// or bump AGREEMENT_VERSION for you — those still get updated by hand once
// the change actually takes effect, the same way every legal-text change
// so far has been. There's no live client base on materially different
// terms yet, so an automatic cutover mechanism isn't built here — this
// covers the actual requirement (advance notice must go out), not a
// speculative future one.
export const MINIMUM_NOTICE_DAYS = 30;

export function isEffectiveDateValid(effectiveDateIso: string, now: Date = new Date()): boolean {
  const ms = new Date(`${effectiveDateIso}T00:00:00Z`).getTime() - now.getTime();
  return ms >= MINIMUM_NOTICE_DAYS * 24 * 60 * 60 * 1000;
}

function urlForDocument(document: LegalDocument): string {
  if (document === "privacy") return PRIVACY_POLICY_URL;
  if (document === "terms") return TERMS_OF_SERVICE_URL;
  return AGREEMENT_URL;
}

// Who "existing clients" means here: anyone who's actually created a portal
// login (client.userId set — i.e. has accepted the current Agreement and
// is bound by it) and isn't already leaving/left (OFFBOARDING_TRIGGER_
// STATUSES — graduated/canceled/closed have no live engagement for a
// future change to matter to).
async function listActiveClientsForNotice() {
  const clients = await listClients({});
  return clients.filter((c) => c.userId && !OFFBOARDING_TRIGGER_STATUSES.includes(c.status));
}

export async function publishLegalNotice(params: { document: LegalDocument; summary: string; effectiveDate: string }) {
  if (!isEffectiveDateValid(params.effectiveDate)) {
    throw new Error(`Effective date must be at least ${MINIMUM_NOTICE_DAYS} days from today.`);
  }

  const notice = await insertLegalNotice(params);
  const documentLabel = LEGAL_DOCUMENT_LABELS[params.document];
  const url = urlForDocument(params.document);
  const effectiveDateLabel = new Date(`${params.effectiveDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const clients = await listActiveClientsForNotice();
  let sent = 0;
  for (const client of clients) {
    const { subject, body } = legalDocumentChangeTemplate(client.fullName, documentLabel, effectiveDateLabel, params.summary, url);
    await sendSystemEmail({ clientId: client.id, template: "legal_document_change", subject, body });
    sent += 1;
  }
  await setLegalNoticeNotifiedCount(notice.id, sent);

  return { notice, notifiedCount: sent };
}
