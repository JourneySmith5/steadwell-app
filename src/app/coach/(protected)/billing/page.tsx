import { requireCoach } from "@/lib/dal";
import { listUninvoicedFoundationForCoach, listInvoicesForCoach } from "@/lib/repo/coachInvoices";
import { listUninvoicedAccountabilityForCoach } from "@/lib/repo/accountabilityPayments";
import { Card, PageHeader, Button, ErrorText } from "@/components/ui";
import { generateInvoiceAction } from "./actions";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Self-service billing for a 1099 coach — Journey's ask: "the 1099 coach
// [should] be able to conveniently bill Steadwell for their cut of
// proceeds from their clients." Every coach-side user (owner included) can
// reach this for themselves; the owner just won't normally have a
// commission percentage set (see the empty state below), since they aren't
// invoicing themselves.
export default async function BillingPage(props: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireCoach();
  const { error } = await props.searchParams;

  const commissionPercent = user.commissionPercent;
  if (commissionPercent === null) {
    return (
      <div>
        <PageHeader title="Billing" subtitle="Invoice Steadwell for your commission on collected Foundation fees and Accountability payments." />
        {error && <ErrorText>{error}</ErrorText>}
        <Card>
          <p className="text-sm text-brand-slate/70">
            You don&apos;t have a commission percentage set yet. Ask the owner to set one on the Team page — once
            it&apos;s set, you&apos;ll be able to generate invoices here.
          </p>
        </Card>
      </div>
    );
  }

  const [foundationItems, accountabilityItems, invoices] = await Promise.all([
    listUninvoicedFoundationForCoach(user.id),
    listUninvoicedAccountabilityForCoach(user.id),
    listInvoicesForCoach(user.id),
  ]);

  const round = (cents: number) => Math.round((cents * commissionPercent) / 100);
  const outstandingFoundationCents = foundationItems.reduce((sum, it) => sum + round(it.amountCents), 0);
  const outstandingAccountabilityCents = accountabilityItems.reduce((sum, it) => sum + round(it.amountCents), 0);
  const outstandingTotalCents = outstandingFoundationCents + outstandingAccountabilityCents;
  const hasOutstanding = foundationItems.length > 0 || accountabilityItems.length > 0;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Invoice Steadwell for your commission on collected Foundation fees and Accountability payments." />

      {error && <ErrorText>{error}</ErrorText>}

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-1">Ready to Invoice</h2>
        <p className="text-xs text-brand-slate/60 mb-4">
          Your commission rate: {commissionPercent}%. Based only on Foundation fees and Accountability months
          actually collected — nothing projected, and nothing already on a past invoice.
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">Foundation</dt>
            <dd className="text-brand-dark font-medium">
              {money(outstandingFoundationCents)} ({foundationItems.length})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">Accountability</dt>
            <dd className="text-brand-dark font-medium">
              {money(outstandingAccountabilityCents)} ({accountabilityItems.length})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">Total</dt>
            <dd className="text-lg text-brand-dark font-medium">{money(outstandingTotalCents)}</dd>
          </div>
        </dl>
        {hasOutstanding ? (
          <form action={generateInvoiceAction}>
            <Button type="submit">Generate Invoice</Button>
          </form>
        ) : (
          <p className="text-sm text-brand-slate/60 italic">Nothing outstanding right now.</p>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-heading text-lg text-brand-dark px-6 pt-5 pb-1">Invoice History</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-brand-slate/70 italic px-6 pb-5">No invoices generated yet.</p>
        ) : (
          <ul className="divide-y divide-brand-pale">
            {invoices.map((inv) => (
              <li key={inv.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-dark font-medium">{money(inv.totalCents)}</p>
                  <p className="text-xs text-brand-slate/60">
                    Generated {new Date(inv.createdAt).toLocaleDateString()} · {inv.commissionPercent}% ·{" "}
                    <span className={inv.status === "paid" ? "text-brand-sage font-semibold" : "text-brand-slate/70"}>
                      {inv.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </p>
                </div>
                <a href={`/api/coach-invoices/${inv.id}/pdf`} className="text-sm text-brand-sage underline whitespace-nowrap">
                  Download PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
