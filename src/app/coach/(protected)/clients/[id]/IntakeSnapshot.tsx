import { Card } from "@/components/ui";
import type { DebtRow } from "@/lib/repo/debts";
import type { FinancialAccountRow } from "@/lib/repo/financialAccounts";
import type { BillRow } from "@/lib/repo/bills";
import type { IncomeSourceRow } from "@/lib/repo/incomeSources";
import type { FoundationIntakeRow } from "@/lib/repo/foundationIntake";
import type { HouseholdMemberRow } from "@/lib/repo/householdMembers";
import type { SavingsRow } from "@/lib/repo/savings";
import type { EmergencyFundRow } from "@/lib/repo/emergencyFund";
import type { SinkingFundRow } from "@/lib/repo/sinkingFunds";
import type { GoalRow } from "@/lib/repo/goals";

// Coach-only view of EVERYTHING the client entered in Foundation Intake —
// every portal section, every field — so Coach never has to go digging.
// Shown whether the intake is submitted, in progress, or reopened.

export interface IntakeData {
  intake: FoundationIntakeRow | undefined;
  dateOfBirth: string | null;
  household: HouseholdMemberRow[];
  income: IncomeSourceRow[];
  accounts: FinancialAccountRow[];
  savings: SavingsRow[];
  emergencyFund: EmergencyFundRow | undefined;
  sinkingFunds: SinkingFundRow[];
  bills: BillRow[];
  debts: DebtRow[];
  goals: GoalRow[];
}

const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(2)}%`);
const text = (s: string | null | undefined) => (s && s.trim() ? s : "—");
const yesNo = (b: boolean) => (b ? "Yes" : "No");
const date = (s: string | null | undefined) => {
  if (!s) return "—";
  // Plain YYYY-MM-DD from <input type="date"> — format without timezone shifts.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : s;
};

export function IntakeSnapshot(props: IntakeData) {
  const { intake, dateOfBirth, household, income, accounts, savings, emergencyFund, sinkingFunds, bills, debts, goals } =
    props;

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
  // Balance-weighted APR — a truer "cost of debt" than a plain average.
  const weightedApr = totalDebt > 0 ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalDebt : null;
  const totalCash =
    accounts.reduce((s, a) => s + a.currentBalance, 0) +
    savings.reduce((s, a) => s + a.currentBalance, 0);
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
        <h2 className="font-heading text-lg text-brand-dark">Foundation Intake</h2>
        <span className="text-xs text-brand-slate/70">{statusLabel}</span>
      </div>

      <div className="space-y-6">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Total debt" value={money(totalDebt)} />
          <Stat label="Min. payments / mo" value={money(totalMin)} />
          <Stat label="Weighted APR" value={pct(weightedApr)} />
          <Stat label="Accounts + savings" value={money(totalCash)} />
          <Stat label="Income / mo" value={money(monthlyIncome)} />
          <Stat label="Bills / mo" value={money(monthlyBills)} />
        </dl>

        <Section title="Household" count={household.length}>
          <p className="text-sm text-brand-slate mb-2">
            <span className="text-brand-slate/60">Client date of birth:</span> {date(dateOfBirth)}
          </p>
          <Table
            head={["Name", "Relationship", "Income included", "Expenses included"]}
            rows={household.map((h) => [h.name, h.relationship, yesNo(h.incomeIncluded), yesNo(h.expensesIncluded)])}
          />
        </Section>

        <Section title="Income" count={income.length}>
          <Table
            head={["Person", "Source", "Type", "Take-home", "Gross", "Frequency", "Predictability", "Variable (low / typical / high)", "Monthly", "Active"]}
            rows={income.map((i) => [
              i.person,
              i.sourceName,
              i.type,
              money(i.takeHome),
              money(i.gross),
              i.frequency,
              i.predictability,
              i.variableTypical != null || i.variableLow != null || i.variableHigh != null
                ? `${money(i.variableLow)} / ${money(i.variableTypical)} / ${money(i.variableHigh)}`
                : "—",
              money(i.normalizedMonthly),
              yesNo(i.active),
            ])}
            numeric={[3, 4, 8]}
          />
        </Section>

        <Section title="Accounts" count={accounts.length}>
          <Table
            head={["Account", "Type", "Balance", "Purpose"]}
            rows={accounts.map((a) => [a.nickname, a.type, money(a.currentBalance), text(a.purpose)])}
            numeric={[2]}
          />
        </Section>

        <Section title="Savings" count={savings.length}>
          <Table
            head={["Name", "Balance", "Purpose"]}
            rows={savings.map((s) => [s.name, money(s.currentBalance), text(s.purpose)])}
            numeric={[1]}
          />
        </Section>

        <Section title="Emergency fund" count={emergencyFund ? 1 : 0}>
          {emergencyFund && (
            <Table
              head={["Current balance", "Target", "Target date", "Notes"]}
              rows={[
                [
                  money(emergencyFund.currentBalance),
                  money(emergencyFund.target),
                  date(emergencyFund.targetDate),
                  text(emergencyFund.notes),
                ],
              ]}
              numeric={[0, 1]}
            />
          )}
        </Section>

        <Section title="Sinking funds" count={sinkingFunds.length}>
          <Table
            head={["Name", "Current", "Target", "Target date", "Notes"]}
            rows={sinkingFunds.map((f) => [
              f.name,
              money(f.currentBalance),
              money(f.targetAmount),
              date(f.targetDate),
              text(f.notes),
            ])}
            numeric={[1, 2]}
          />
        </Section>

        <Section title="Bills" count={bills.length}>
          <Table
            head={["Bill", "Category", "Amount", "Frequency", "Fixed / variable", "Monthly", "Due"]}
            rows={bills.map((b) => [
              b.name,
              b.category,
              money(b.amount),
              b.frequency,
              b.fixedOrVariable,
              money(b.monthlyEquivalent),
              text(b.dueDate),
            ])}
            numeric={[2, 5]}
          />
        </Section>

        <Section title="Debts" count={debts.length} note="Sorted by APR, highest first.">
          <Table
            head={["Creditor", "Type", "Balance", "APR", "Min. payment", "Due", "Promo rate", "Promo ends"]}
            rows={[...debts]
              .sort((a, b) => b.apr - a.apr)
              .map((d) => [
                d.creditor,
                d.type,
                money(d.balance),
                pct(d.apr),
                money(d.minimumPayment),
                text(d.dueDate),
                pct(d.promoRate),
                date(d.promoExpiresAt),
              ])}
            numeric={[2, 3, 4, 6]}
          />
        </Section>

        <Section title="Goals" count={goals.length}>
          <Table
            head={["Goal", "Priority", "Current", "Target", "Deadline", "Why it matters"]}
            rows={goals.map((g) => [
              g.name,
              g.priority,
              money(g.currentAmount),
              money(g.target),
              g.hasDeadline ? date(g.targetDate) : "No deadline",
              text(g.why),
            ])}
            numeric={[2, 3]}
          />
        </Section>

        <Section title="Anything else from the client" count={intake?.additionalInfo ? 1 : 0}>
          {intake?.additionalInfo && (
            <p className="text-sm text-brand-slate whitespace-pre-wrap">{intake.additionalInfo}</p>
          )}
        </Section>
      </div>
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

// Every section always renders — an empty one says so, so Coach can tell
// "client skipped this" apart from "this page doesn't show it."
function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-brand-dark mb-2">
        {title}
        {count > 1 && <span className="text-brand-slate/60 font-normal"> ({count})</span>}
      </h3>
      {count === 0 && title !== "Household" ? (
        <p className="text-sm text-brand-slate/60 italic">Nothing entered.</p>
      ) : (
        <>
          {children}
          {note && <p className="text-xs text-brand-slate/60 mt-1">{note}</p>}
        </>
      )}
    </div>
  );
}

function Table({ head, rows, numeric = [] }: { head: string[]; rows: string[][]; numeric?: number[] }) {
  if (rows.length === 0) return <p className="text-sm text-brand-slate/60 italic">Nothing entered.</p>;
  const isNum = (i: number) => numeric.includes(i);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-brand-slate/60 text-xs uppercase tracking-wide">
            {head.map((h, i) => (
              <th key={h} className={`py-1 pr-3 font-normal whitespace-nowrap ${isNum(i) ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-pale">
          {rows.map((r, ri) => (
            <tr key={ri} className="align-top">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`py-1.5 pr-3 ${isNum(ci) ? "text-right tabular-nums whitespace-nowrap" : ""} ${ci === 0 ? "text-brand-dark" : "text-brand-slate"}`}
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
