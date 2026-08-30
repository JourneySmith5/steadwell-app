import Link from "next/link";
import { requireClient } from "@/lib/dal";
import { PageHeader, Card, Button, TextArea, ErrorText } from "@/components/ui";
import { getOrCreateFoundationIntake } from "@/lib/repo/foundationIntake";
import { listHouseholdMembers } from "@/lib/repo/householdMembers";
import { listIncomeSources, totalNormalizedMonthlyIncome } from "@/lib/repo/incomeSources";
import { listFinancialAccounts } from "@/lib/repo/financialAccounts";
import { listBills, totalMonthlyBills } from "@/lib/repo/bills";
import { listDebts, debtSummary } from "@/lib/repo/debts";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listSavings } from "@/lib/repo/savings";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listGoals } from "@/lib/repo/goals";
import { saveAdditionalInfo, submitIntake, requestUpdate } from "./actions";
import { FOUNDATION_SECTIONS } from "./shared";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function FoundationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireClient();
  if (!user.client) return null;
  const clientId = user.client.id;

  const intake = await getOrCreateFoundationIntake(clientId);
  const locked = intake.status === "submitted";

  const [household, income, accounts, bills, debts, ef, savings, sinking, goals, debts_, normalizedMonthlyIncome, monthlyBills] =
    await Promise.all([
      listHouseholdMembers(clientId),
      listIncomeSources(clientId),
      listFinancialAccounts(clientId),
      listBills(clientId),
      listDebts(clientId),
      findEmergencyFund(clientId),
      listSavings(clientId),
      listSinkingFunds(clientId),
      listGoals(clientId),
      debtSummary(clientId),
      totalNormalizedMonthlyIncome(clientId),
      totalMonthlyBills(clientId),
    ]);

  // Completion here is informational, not a submission gate — the one hard
  // rule the blueprint enforces at submit time is "at least one Goal" (see
  // actions.ts). Everything else (zero debts, no sinking funds, etc.) is a
  // legitimate real answer, not "incomplete." A fuller build would let a
  // client mark a section explicitly N/A per §4; deferred for the same
  // reason per-section unlock is (see requestUpdate in actions.ts).
  // Status text keyed by href — FOUNDATION_SECTIONS (imported from ./shared)
  // is the single source of truth for section order/labels, shared with
  // SectionFooterNav on each section page, so the two never drift apart.
  const statusByHref: Record<string, string> = {
    household: household.length ? `${household.length} member${household.length === 1 ? "" : "s"}` : "Not started",
    income: income.length ? `${income.length} source${income.length === 1 ? "" : "s"} · ${money(normalizedMonthlyIncome)}/mo` : "Not started",
    accounts: accounts.length ? `${accounts.length} account${accounts.length === 1 ? "" : "s"}` : "Not started",
    statements: "Coming soon",
    bills: bills.length ? `${bills.length} bill${bills.length === 1 ? "" : "s"} · ${money(monthlyBills)}/mo` : "Not started",
    debts: debts.length ? `${debts.length} debt${debts.length === 1 ? "" : "s"} · ${money(debts_.totalBalance)} total` : "None entered",
    "emergency-fund": ef ? `${money(ef.currentBalance)} of ${money(ef.target)} target` : "Not started",
    savings: savings.length ? `${savings.length} account${savings.length === 1 ? "" : "s"}` : "None entered",
    "sinking-funds": sinking.length ? `${sinking.length} fund${sinking.length === 1 ? "" : "s"}` : "None entered",
    goals: goals.length ? `${goals.length} goal${goals.length === 1 ? "" : "s"}` : "Required — add at least one",
  };
  const rows = FOUNDATION_SECTIONS.map((s) => ({ ...s, status: statusByHref[s.href] ?? "" }));

  return (
    <div>
      <PageHeader
        title="Financial Foundation"
        subtitle="The full financial picture Coach uses to build your plan. Progress saves automatically as you go; nothing to submit until you're ready."
      />

      {locked && (
        <Card className="mb-6 bg-brand-pale/40">
          <p className="text-sm text-brand-dark font-medium mb-2">Submitted — {intake.submittedAt}</p>
          <p className="text-sm text-brand-slate mb-4">
            Your Foundation Intake is locked for editing while Coach reviews it. Need to change something? Request
            an update — this reopens every section (not just one) for editing.
          </p>
          <form action={requestUpdate}>
            <Button type="submit" variant="secondary">
              Request an Update
            </Button>
          </form>
        </Card>
      )}

      <Card className="mb-6 p-0 overflow-hidden">
        {rows.map((r, i) => (
          <Link
            key={r.href}
            href={`/portal/foundation/${r.href}`}
            className={`flex items-center justify-between px-6 py-4 hover:bg-brand-pale/30 transition-colors ${i > 0 ? "border-t border-brand-pale" : ""}`}
          >
            <span className="font-medium text-brand-dark">{r.label}</span>
            <span className="text-sm text-brand-slate/80">{r.status}</span>
          </Link>
        ))}
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Additional Information</h2>
        <form action={saveAdditionalInfo}>
          <TextArea
            name="additionalInfo"
            rows={4}
            defaultValue={intake.additionalInfo ?? ""}
            placeholder="Anything else Coach should know about your finances?"
            disabled={locked}
          />
          {!locked && (
            <div className="mt-3">
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </div>
          )}
        </form>
      </Card>

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-2">Ready to Submit?</h2>
          <p className="text-sm text-brand-slate mb-4">
            Once submitted, sections lock for Coach&apos;s review. You can always request an update later if
            something changes.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <form action={submitIntake}>
            <Button type="submit">Submit Foundation Intake</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
