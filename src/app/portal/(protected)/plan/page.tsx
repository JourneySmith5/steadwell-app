import Link from "next/link";
import { requireClient } from "@/lib/dal";
import { declineAccountability } from "./actions";
import { PageHeader, Card, Button } from "@/components/ui";
import { Stub } from "@/components/Stub";
import { computeBaseline, computeAllocationSummary, computeGoalCompletion } from "@/lib/planCalc";
import { listAllocationLines, findEmergencyAllocation } from "@/lib/repo/allocationLines";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listDebts } from "@/lib/repo/debts";
import { findDebtDecisionByDebtId } from "@/lib/repo/debtDecisions";
import { listGoals } from "@/lib/repo/goals";
import { listActionItems } from "@/lib/repo/actionItems";
import { findApplicationByClientId } from "@/lib/repo/applications";
import { ACTION_ITEM_STATUS_LABELS } from "@/lib/enums";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function PlanPage() {
  const user = await requireClient();
  const client = user.client;
  const status = client?.status;

  // §8: the plan is a fixed snapshot from finalization, not a live budgeting
  // tool — once planStatus reaches "active" it stays visible to the client
  // (through Accountability, Graduated, and the retention window) even
  // though the underlying client pipeline status keeps moving.
  if (!client || client.planStatus !== "active") {
    return (
      <Stub
        title="My Plan"
        note="Your finalized plan will appear here once Coach presents it after your plan-review meeting."
      />
    );
  }

  const clientId = client.id;
  const [baseline, summary, flexLines, ef, efAllocation, sinkingFunds, sinkingAllocations, debts, goals, goalAllocations, actions, application] =
    await Promise.all([
      computeBaseline(clientId),
      computeAllocationSummary(clientId),
      listAllocationLines(clientId, "flex"),
      findEmergencyFund(clientId),
      findEmergencyAllocation(clientId),
      listSinkingFunds(clientId),
      listAllocationLines(clientId, "sinking"),
      listDebts(clientId),
      listGoals(clientId),
      listAllocationLines(clientId, "goal"),
      listActionItems(clientId),
      findApplicationByClientId(clientId),
    ]);
  // What the client themselves said, in their own words, when they applied
  // — not client.planGeneralRationale, which is Coach's private planning
  // notes (its own field hint says "never shown to the client verbatim").
  // "Your Priorities" used to render that private field directly; this is
  // the actual fix, not just a relabel.
  const statedGoals = (application?.goalsNext12Months ?? []).filter((g) => g.trim());
  const debtDecisions = new Map(
    (await Promise.all(debts.map((d) => findDebtDecisionByDebtId(d.id)))).map((decision, idx) => [debts[idx].id, decision])
  );

  return (
    <div>
      <PageHeader
        title="Your Financial Plan"
        subtitle={client.planFinalizedAt ? `Finalized ${new Date(client.planFinalizedAt).toLocaleDateString()}` : undefined}
      />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Your Starting Point</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Monthly Income" value={money(baseline.normalizedMonthlyIncome)} />
          <Stat label="Bills & Debt Minimums" value={money(baseline.monthlyBills + baseline.debtMinimums)} />
          <Stat label="Typical Spending" value={money(baseline.historicalSpendingMonthly)} />
          <Stat label="Available Cash Flow" value={money(baseline.availableMonthlyCashFlow)} />
        </dl>
      </Card>

      {(statedGoals.length > 0 || application?.success_definition) && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Your Priorities</h2>
          {statedGoals.length > 0 && (
            <ul className="text-sm text-brand-slate list-disc list-inside mb-2">
              {statedGoals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          )}
          {application?.success_definition && (
            <p className="text-sm text-brand-slate whitespace-pre-wrap">
              <span className="text-brand-slate/60">What success looks like to you: </span>
              {application.success_definition}
            </p>
          )}
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Your Monthly Plan</h2>
        {flexLines.length > 0 && (
          <ul className="text-sm text-brand-slate divide-y divide-brand-pale mb-3">
            {flexLines.map((l) => (
              <li key={l.id} className="py-2 flex justify-between">
                <span>{l.category}</span>
                <span className="font-medium text-brand-dark">{money(l.plannedAmount)}/mo</span>
              </li>
            ))}
          </ul>
        )}
        <ul className="text-sm text-brand-slate divide-y divide-brand-pale">
          <li className="py-2 flex justify-between">
            <span>Emergency Fund</span>
            <span className="font-medium text-brand-dark">{money(efAllocation?.plannedAmount ?? 0)}/mo</span>
          </li>
          <li className="py-2 flex justify-between">
            <span>Debt Acceleration</span>
            <span className="font-medium text-brand-dark">{money(summary.debtAccelerationTotal)}/mo</span>
          </li>
          <li className="py-2 flex justify-between">
            <span>Sinking Funds</span>
            <span className="font-medium text-brand-dark">{money(summary.sinkingPlannedTotal)}/mo</span>
          </li>
          <li className="py-2 flex justify-between">
            <span>Financial Goals</span>
            <span className="font-medium text-brand-dark">{money(summary.goalsPlannedTotal)}/mo</span>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t border-brand-pale flex justify-between text-sm">
          <span className="text-brand-dark font-medium">Total Planned</span>
          <span className="text-brand-dark font-medium">{money(summary.plannedOutflowTotal)}/mo</span>
        </div>
      </Card>

      {debts.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Debt Strategy</h2>
          <ul className="divide-y divide-brand-pale">
            {debts.map((d) => {
              const decision = debtDecisions.get(d.id);
              return (
                <li key={d.id} className="py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-brand-dark">{d.creditor}</span>
                    <span className="text-brand-slate">{decision ? money(decision.plannedPayment) + "/mo" : "—"}</span>
                  </div>
                  <p className="text-xs text-brand-slate/70 mt-1">
                    Balance {money(d.balance)} · {decision?.strategy ?? "—"} strategy
                    {decision?.monthsToPayoff != null && ` · ${decision.monthsToPayoff} months to payoff`}
                    {decision?.totalInterest != null && ` · ${money(decision.totalInterest)} total interest`}
                  </p>
                  {decision?.rationale && <p className="text-xs text-brand-slate/70 mt-1">&ldquo;{decision.rationale}&rdquo;</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Emergency Fund</h2>
        <p className="text-sm text-brand-slate">
          {ef ? `${money(ef.currentBalance)} of ${money(ef.target)} target` : "Not tracked"} · planned{" "}
          {money(efAllocation?.plannedAmount ?? 0)}/mo
        </p>
      </Card>

      {sinkingFunds.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Sinking Funds</h2>
          <ul className="divide-y divide-brand-pale">
            {sinkingFunds.map((f) => {
              const alloc = sinkingAllocations.find((a) => a.linkedSinkingFundId === f.id);
              return (
                <li key={f.id} className="py-2 text-sm flex justify-between">
                  <span>
                    {f.name} <span className="text-brand-slate/70">— target {f.targetDate}</span>
                  </span>
                  <span className="font-medium text-brand-dark">
                    {money(f.currentBalance)} of {money(f.targetAmount)} · {money(alloc?.plannedAmount ?? 0)}/mo
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {goals.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Financial Goals</h2>
          <ul className="divide-y divide-brand-pale">
            {goals.map((g) => {
              const alloc = goalAllocations.find((a) => a.linkedGoalId === g.id);
              const planned = alloc?.plannedAmount ?? 0;
              const completion = computeGoalCompletion(g.target, g.currentAmount, planned);
              return (
                <li key={g.id} className="py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-brand-dark">{g.name}</span>
                    <span className="text-brand-slate">{money(planned)}/mo</span>
                  </div>
                  <p className="text-xs text-brand-slate/70 mt-1">
                    {money(g.currentAmount)} of {money(g.target)}
                    {completion.projectedDate && ` · projected ${completion.projectedDate}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {actions.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-brand-dark mb-3">Your First 30 Days</h2>
          <ul className="divide-y divide-brand-pale">
            {actions.map((a) => (
              <li key={a.id} className="py-2 text-sm flex justify-between">
                <span>
                  {a.description}
                  {a.dueDate && <span className="text-brand-slate/70"> — by {a.dueDate}</span>}
                </span>
                <span className="text-brand-slate">{ACTION_ITEM_STATUS_LABELS[a.status]}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6">
        <a href="/portal/plan/pdf" className="text-sm text-brand-dark hover:underline">
          Download as PDF →
        </a>
      </div>

      {status === "plan_active" && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-2">What&apos;s Next?</h2>
          <p className="text-sm text-brand-slate mb-4">
            Choose an Accountability tier to keep working together, or wrap up here — either
            way, your plan and records stay available for 30 days after this choice, then are
            permanently deleted.
          </p>
          <div className="flex gap-3">
            <Link href="/portal/accountability">
              <Button>Choose an Accountability Tier</Button>
            </Link>
            <form action={declineAccountability}>
              <Button type="submit" variant="secondary">
                No thanks — I&apos;m done
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">{label}</dt>
      <dd className="text-brand-dark font-medium">{value}</dd>
    </div>
  );
}
