import { requireOwner } from "@/lib/dal";
import { listCoachSideUsers } from "@/lib/repo/users";
import {
  getFoundationRevenueTotals,
  getActiveSubscriptionsMrr,
  getRevenueByCoach,
  getDiscountCodeImpact,
} from "@/lib/repo/reports";
import { Card, PageHeader } from "@/components/ui";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ReportsPage() {
  await requireOwner();

  const [totals, mrr, revenueByCoach, discountImpact, coachUsers] = await Promise.all([
    getFoundationRevenueTotals(),
    getActiveSubscriptionsMrr(),
    getRevenueByCoach(),
    getDiscountCodeImpact(),
    listCoachSideUsers(),
  ]);

  // Every current owner/coach shows up even at $0 — merge the roster in
  // rather than only listing coaches who already have revenue.
  const revenueByCoachId = new Map(revenueByCoach.map((r) => [r.coachId, r]));
  const coachRows = coachUsers.map((u) => ({
    label: u.fullName ?? u.email,
    ...(revenueByCoachId.get(u.id) ?? {
      foundationCollectedCents: 0,
      foundationPaidCount: 0,
      activeSubscriptionCount: 0,
      mrrCents: 0,
    }),
  }));
  const unassigned = revenueByCoachId.get(null);
  if (unassigned && (unassigned.foundationPaidCount > 0 || unassigned.activeSubscriptionCount > 0)) {
    coachRows.push({ label: "Unassigned", ...unassigned });
  }

  return (
    <div>
      <PageHeader title="Revenue Reports" subtitle="Owner-only — revenue, subscriptions, and discount code impact across the whole business." />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-1">Total Revenue Collected</h2>
        <p className="text-xs text-brand-slate/60 mb-4">
          Financial Foundation fees only — the one-time $399 payment. Accountability is billed and collected by
          Stripe directly; see &ldquo;Active Subscriptions / MRR&rdquo; below for its current run-rate rather than
          money already collected.
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="All-Time" value={money(totals.allTimeCents)} />
          <Stat label="This Month" value={money(totals.monthToDateCents)} />
          <Stat label="Foundation Payments" value={String(totals.paidCount)} />
        </dl>
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-1">Active Subscriptions / MRR</h2>
        <p className="text-xs text-brand-slate/60 mb-4">
          Monthly recurring revenue projected from currently-active Accountability subscriptions at each tier&apos;s
          price — a live snapshot, not a record of what&apos;s already been collected.
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Total MRR" value={money(mrr.totalMrrCents)} emphasis />
          <Stat label="Active Subscriptions" value={String(mrr.totalActiveCount)} />
        </dl>
        <ul className="divide-y divide-brand-pale">
          {mrr.byTier.map((t) => (
            <li key={t.tierId} className="py-2 flex items-center justify-between text-sm">
              <span className="text-brand-dark">{t.label}</span>
              <span className="text-brand-slate/70">
                {t.activeCount} active · {money(t.mrrCents)}/mo
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-1">Revenue by Coach</h2>
        <p className="text-xs text-brand-slate/60 mb-4">Foundation fees collected and current MRR from each coach&apos;s assigned clients.</p>
        {coachRows.length === 0 && <p className="text-sm text-brand-slate/70 italic">No coaches yet.</p>}
        <ul className="divide-y divide-brand-pale">
          {coachRows.map((r) => (
            <li key={r.label} className="py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-brand-dark font-medium">{r.label}</span>
              <span className="text-sm text-brand-slate/70 text-right">
                {money(r.foundationCollectedCents)} collected ({r.foundationPaidCount})
                <span className="block text-xs">
                  {r.activeSubscriptionCount} active subscription{r.activeSubscriptionCount === 1 ? "" : "s"} · {money(r.mrrCents)}/mo
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-1">Discount Code Impact</h2>
        <p className="text-xs text-brand-slate/60 mb-4">
          Paid Foundation fees that used a discount code — amount given up is estimated against the full $399 fee.
        </p>
        {discountImpact.length === 0 && <p className="text-sm text-brand-slate/70 italic">No discounted payments yet.</p>}
        <ul className="divide-y divide-brand-pale">
          {discountImpact.map((d) => (
            <li key={d.discountCode} className="py-2 flex items-center justify-between text-sm">
              <span className="font-mono text-brand-dark">{d.discountCode}</span>
              <span className="text-brand-slate/70">
                {d.redemptionCount}× · {money(d.collectedCents)} collected · {money(d.estimatedGivenUpCents)} given up
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">{label}</dt>
      <dd className={`font-medium ${emphasis ? "text-lg text-brand-dark" : "text-brand-dark"}`}>{value}</dd>
    </div>
  );
}
