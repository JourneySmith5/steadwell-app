import { Card } from "@/components/ui";
import type { DebtRow } from "@/lib/repo/debts";
import type { FinancialAccountRow } from "@/lib/repo/financialAccounts";
import type { BillRow } from "@/lib/repo/bills";
import type { IncomeSourceRow } from "@/lib/repo/incomeSources";
import type { FoundationIntakeRow } from "@/lib/repo/foundationIntake";

// Coach-only quick reference of what the client entered in Foundation
// Intake. Shown whether the intake is submitted or still in progress, so
// Coach can see partial answers (and answers on a reopened intake) without
// waiting on a status change.

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const pct = (n: number) => `${n.toFixed(2)}%`;

export function IntakeSnapshot({
  intake,
  debts,
  accounts,
  income,
  bills,
}: {
  intake: FoundationIntakeRow | undefined;
  debts: DebtRow[];
  accounts: FinancialAccountRow[];
  income: IncomeSourceRow[];
  bills: BillRow[];
}) {
  const hasAnything = debts.length + accounts.length + income.length + bills.length > 0 || !!intake?.additionalInfo;

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
  // Balance-weighted APR — a truer "cost of debt" than a plain average.
  const weightedApr = totalDebt > 0 ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalDebt : 0;
  const totalCash = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const monthlyIncome = income.filter((i) => i.active).reduce((s, i) => s + i.normalizedMonthly, 0);
  const monthlyBills = bills.reduce((s, b) => s + b.monthlyEquivalent, 0);

  const statusLabel = !intake
    ? "Not started"
    : intake.status === "submitted"
      ? `Submitted ${intake.submittedAt ? new Date(intake.submittedAt).toLocaleDateString() : ""}`
      : intake.submittedAt
        ? `Reopened — last submitted ${new Date(intake.submittedAt).toLocaleDateString()}`
        : "In progress";

  return (
    <Card id="intake">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg text-brand-dark">Intake Snapshot</h2>
        <span className="text-xs text-brand-slate/70">{statusLabel}</span>
      </div>

      {!hasAnything ? (
        <p className="text-sm text-brand-slate">Client hasn&apos;t entered any intake details yet.</p>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total debt" value={money(totalDebt)} />
            <Stat label="Min. payments / mo" value={money(totalMin)} />
            <Stat label="Weighted APR" value={totalDebt > 0 ? pct(weightedApr) : "—"} />
            <Stat label="Cash on hand" value={money(totalCash)} />
            <Stat label="Income / mo" value={money(monthlyIncome)} />
            <Stat label="Bills / mo" value={money(monthlyBills)} />
          </dl>

          {debts.length > 0 && (
            <Section title={`Debts (${debts.length})`}>
              <Table
                head={["Creditor", "Type", "Balance", "APR", "Min.", "Due"]}
                rows={[...debts]
                  .sort((a, b) => b.apr - a.apr)
                  .map((d) => [
                    d.creditor,
                    d.type,
                    money(d.balance),
                    d.promoRate != null
                      ? `${pct(d.promoRate)} promo${d.promoExpiresAt ? ` until ${d.promoExpiresAt}` : ""} (then ${pct(d.apr)})`
                      : pct(d.apr),
                    money(d.minimumPayment),
                    d.dueDate ?? "—",
                  ])}
                numeric={[2, 3, 4]}
              />
              <p className="text-xs text-brand-slate/60 mt-1">Sorted by APR, highest first.</p>
            </Section>
          )}

          {accounts.length > 0 && (
            <Section title={`Accounts (${accounts.length})`}>
              <Table
                head={["Account", "Type", "Balance", "Purpose"]}
                rows={accounts.map((a) => [a.nickname, a.type, money(a.currentBalance), a.purpose ?? "—"])}
                numeric={[2]}
              />
            </Section>
          )}

          {income.length > 0 && (
            <Section title={`Income (${income.length})`}>
              <Table
                head={["Person", "Source", "Take-home", "Frequency", "Monthly"]}
                rows={income.map((i) => [
                  i.person,
                  `${i.sourceName}${i.active ? "" : " (inactive)"}`,
                  money(i.takeHome),
                  i.frequency,
                  money(i.normalizedMonthly),
                ])}
                numeric={[2, 4]}
              />
            </Section>
          )}

          {bills.length > 0 && (
            <Section title={`Bills (${bills.length})`}>
              <Table
                head={["Bill", "Category", "Amount", "Frequency", "Monthly", "Due"]}
                rows={bills.map((b) => [
                  b.name,
                  b.category,
                  money(b.amount),
                  b.frequency,
                  money(b.monthlyEquivalent),
                  b.dueDate ?? "—",
                ])}
                numeric={[2, 4]}
              />
            </Section>
          )}

          {intake?.additionalInfo && (
            <Section title="Anything else from the client">
              <p className="text-sm text-brand-slate whitespace-pre-wrap">{intake.additionalInfo}</p>
            </Section>
          )}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-brand-pale/40 px-3 py-2">
      <dt className="text-brand-slate/60 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-brand-dark font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-brand-dark mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Table({
  head,
  rows,
  numeric = [],
}: {
  head: string[];
  rows: string[][];
  numeric?: number[];
}) {
  const isNum = (i: number) => numeric.includes(i);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-brand-slate/60 text-xs uppercase tracking-wide">
            {head.map((h, i) => (
              <th key={h} className={`py-1 pr-3 font-normal ${isNum(i) ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-pale">
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`py-1.5 pr-3 text-brand-slate ${isNum(ci) ? "text-right tabular-nums" : ""} ${ci === 0 ? "text-brand-dark" : ""}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
