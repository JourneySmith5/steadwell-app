import { requireOwner } from "@/lib/dal";
import { Card, PageHeader } from "@/components/ui";
import { listAllLegalNotices } from "@/lib/repo/legalNotices";
import { LEGAL_DOCUMENT_LABELS } from "@/lib/enums";
import { MINIMUM_NOTICE_DAYS } from "@/lib/legalNotices";
import { PublishNoticeForm } from "./PublishNoticeForm";

export default async function LegalNoticesPage(props: PageProps<"/coach/settings/legal-notices">) {
  await requireOwner();
  const { published, error } = await props.searchParams;
  const notices = await listAllLegalNotices();

  const minDate = new Date(new Date().getTime() + MINIMUM_NOTICE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Legal Notices"
        subtitle={`Agreement §14.2 / Terms §15 — publishing a material change here emails every currently-enrolled client and posts a Portal banner, at least ${MINIMUM_NOTICE_DAYS} days before it takes effect.`}
      />

      {published !== undefined && (
        <div className="mb-6 rounded-md bg-brand-sage/20 border border-brand-sage text-brand-dark text-sm px-4 py-3">
          Notice published — {published} client{published === "1" ? "" : "s"} notified by email.
        </div>
      )}
      {error && <div className="mb-6 rounded-md bg-red-50 border border-red-300 text-red-800 text-sm px-4 py-3">{error}</div>}

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Publish a Notice</h2>
        <p className="text-xs text-brand-slate/60 mb-4">
          This is the notice mechanism itself — it doesn&apos;t rewrite the actual Agreement, Privacy Policy,
          or Terms text. Update that by hand (agreementContent.ts / privacyContent.ts / termsContent.ts) once
          the change actually takes effect, same as every legal-text change so far.
        </p>
        <PublishNoticeForm minDate={minDate} />
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Notice History</h2>
        {notices.length === 0 ? (
          <p className="text-sm text-brand-slate">No notices have been published yet.</p>
        ) : (
          <ul className="divide-y divide-brand-pale">
            {notices.map((n) => (
              <li key={n.id} className="py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-brand-dark">{LEGAL_DOCUMENT_LABELS[n.document]}</span>
                  <span className="text-brand-slate">
                    {n.effectiveDate >= today ? "Upcoming" : "In effect"} — {new Date(`${n.effectiveDate}T00:00:00Z`).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-brand-slate/70 mt-1">{n.summary}</p>
                <p className="text-xs text-brand-slate/60 mt-1">
                  Published {new Date(n.createdAt).toLocaleDateString()} — {n.notifiedCount} client
                  {n.notifiedCount === 1 ? "" : "s"} notified.
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
