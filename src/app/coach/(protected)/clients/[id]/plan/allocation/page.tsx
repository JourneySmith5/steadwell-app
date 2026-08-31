import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { computeAllocationSummary } from "@/lib/planCalc";
import { listAllocationLines, findEmergencyAllocation } from "@/lib/repo/allocationLines";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listDebts } from "@/lib/repo/debts";
import { findDebtDecisionByDebtId } from "@/lib/repo/debtDecisions";
import { listGoals } from "@/lib/repo/goals";
import { Card, Field, TextInput, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import {
  addFlexCategory,
  saveFlexCategory,
  removeFlexCategory,
  saveEmergencyAllocation,
  saveSinkingFundAllocation,
  saveDebtPlannedPayment,
  saveGoalPlannedAmount,
} from "./actions";

export default async function AllocationPage(props: PageProps<"/coach/clients/[id]/plan/allocation">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const [summary, flexLines, efAllocation, ef, sinkingFunds, sinkingAllocations, debts, goals, goalAllocations] = await Promise.all([
    computeAllocationSummary(clientId),
    listAllocationLines(clientId, "flex"),
    findEmergencyAllocation(clientId),
    findEmergencyFund(clientId),
    listSinkingFunds(clientId),
    listAllocationLines(clientId, "sinking"),
    listDebts(clientId),
    listGoals(clientId),
    listAllocationLines(clientId, "goal"),
  ]);
  const debtDecisions = new Map(
    (await Promise.all(debts.map((d) => findDebtDecisionByDebtId(d.id)))).map((decision, idx) => [debts[idx].id, decision])
  );

  return (
    <div>
      <PlanBuilderHeader client={client} current="/allocation" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Stage 3 — Cash-Flow Allocation Workspace</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          <Stat label="Planned Income" value={money(summary.incomeAvailableToPlan)} />
          <Stat label="Planned Outflow" value={money(summary.plannedOutflowTotal)} />
          <Stat
            label="Difference"
            value={money(summary.difference)}
            emphasis={summary.difference === 0 ? "good" : "warn"}
          />
          <Stat label="Status" value={summary.difference === 0 ? "Balanced" : "Not balanced"} emphasis={summary.difference === 0 ? "good" : "warn"} />
        </div>
        <p className="text-xs text-brand-slate/70">
          Planned Income is income minus fixed obligations only (bills &amp; debt minimums) — not minus historical
          spending, since redirecting that spending is the point of the plan. The plan can&apos;t be finalized
          until the difference is $0. Debt Acceleration and Goals totals below come from the Debt Strategy and
          Savings &amp; Goals pages.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Flexible Living-Expense Categories</h2>
        {flexLines.length === 0 && <p className="text-sm text-brand-slate/70 italic mb-4">None yet.</p>}
        {flexLines.map((l) => (
          <div key={l.id} className="mb-3 pb-3 border-b border-brand-pale last:border-0">
            <form action={saveFlexCategory.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <input type="hidden" name="id" value={l.id} />
              <Field label="Category">
                <TextInput name="category" defaultValue={l.category} required />
              </Field>
              <Field label="Historical avg" hint="Optional.">
                <TextInput type="number" step="0.01" name="historicalAverage" defaultValue={l.historicalAverage ?? undefined} />
              </Field>
              <Field label="Planned amount">
                <TextInput type="number" step="0.01" name="plannedAmount" defaultValue={l.plannedAmount} required />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </div>
            </form>
            <form action={removeFlexCategory.bind(null, clientId)} className="mt-2">
              <input type="hidden" name="id" value={l.id} />
              <Button type="submit" variant="danger" className="text-xs px-2 py-1">
                Remove
              </Button>
            </form>
          </div>
        ))}

        <form action={addFlexCategory.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-2">
          <Field label="Category">
            <TextInput name="category" required placeholder="e.g. Groceries" />
          </Field>
          <Field label="Historical avg" hint="Optional.">
            <TextInput type="number" step="0.01" name="historicalAverage" />
          </Field>
          <Field label="Planned amount">
            <TextInput type="number" step="0.01" name="plannedAmount" required defaultValue={0} />
          </Field>
          <div>
            <Button type="submit">Add Category</Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Emergency Fund</h2>
        <p className="text-sm text-brand-slate mb-3">
          {ef ? `Currently ${money(ef.currentBalance)} of ${money(ef.target)} target.` : "No Emergency Fund data from Foundation Intake."}
        </p>
        <form action={saveEmergencyAllocation.bind(null, clientId)} className="flex items-end gap-3">
          <Field label="Planned monthly amount">
            <TextInput type="number" step="0.01" name="plannedAmount" defaultValue={efAllocation?.plannedAmount ?? 0} required />
          </Field>
          <Button type="submit" variant="secondary">
            Save
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Sinking Funds</h2>
        {sinkingFunds.length === 0 && <p className="text-sm text-brand-slate/70 italic">None entered in Foundation Intake.</p>}
        {sinkingFunds.map((f) => {
          const alloc = sinkingAllocations.find((a) => a.linkedSinkingFundId === f.id);
          return (
            <form
              key={f.id}
              action={saveSinkingFundAllocation.bind(null, clientId)}
              className="flex items-end gap-3 mb-3 pb-3 border-b border-brand-pale last:border-0"
            >
              <input type="hidden" name="sinkingFundId" value={f.id} />
              <div className="flex-1 text-sm text-brand-slate">
                <span className="font-medium text-brand-dark">{f.name}</span> — {money(f.currentBalance)} of{" "}
                {money(f.targetAmount)}, target {f.targetDate}
              </div>
              <Field label="Planned monthly">
                <TextInput type="number" step="0.01" name="plannedAmount" defaultValue={alloc?.plannedAmount ?? 0} required />
              </Field>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
          );
        })}
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-brand-dark">Debt Acceleration</h2>
          <Link href={`/coach/clients/${clientId}/plan/debts`} className="text-xs text-brand-slate hover:underline">
            Priority, strategy &amp; payoff insights →
          </Link>
        </div>
        {debts.length === 0 && <p className="text-sm text-brand-slate/70 italic">No debts entered in Foundation Intake.</p>}
        {debts.map((d) => {
          const decision = debtDecisions.get(d.id);
          return (
            <form
              key={d.id}
              action={saveDebtPlannedPayment.bind(null, clientId)}
              className="flex items-end gap-3 mb-3 pb-3 border-b border-brand-pale last:border-0"
            >
              <input type="hidden" name="debtId" value={d.id} />
              <div className="flex-1 text-sm text-brand-slate">
                <span className="font-medium text-brand-dark">{d.creditor}</span> — balance {money(d.balance)}, APR{" "}
                {d.apr}%, minimum {money(d.minimumPayment)}
                {decision?.monthsToPayoff != null && (
                  <span className="block text-xs text-brand-slate/70 mt-0.5">
                    Projected payoff: {decision.monthsToPayoff} month{decision.monthsToPayoff === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <Field label="Planned monthly payment">
                <TextInput
                  type="number"
                  step="0.01"
                  name="plannedPayment"
                  defaultValue={decision?.plannedPayment ?? d.minimumPayment}
                  required
                />
              </Field>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
          );
        })}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-brand-dark">Financial Goals</h2>
          <Link href={`/coach/clients/${clientId}/plan/goals`} className="text-xs text-brand-slate hover:underline">
            Priority, why &amp; completion insights →
          </Link>
        </div>
        {goals.length === 0 && <p className="text-sm text-brand-slate/70 italic">No goals entered in Foundation Intake.</p>}
        {goals.map((g) => {
          const alloc = goalAllocations.find((a) => a.linkedGoalId === g.id);
          return (
            <form
              key={g.id}
              action={saveGoalPlannedAmount.bind(null, clientId)}
              className="flex items-end gap-3 mb-3 pb-3 border-b border-brand-pale last:border-0"
            >
              <input type="hidden" name="goalId" value={g.id} />
              <div className="flex-1 text-sm text-brand-slate">
                <span className="font-medium text-brand-dark">{g.name}</span> — {money(g.currentAmount)} of{" "}
                {money(g.target)}
                {g.hasDeadline && g.targetDate && ` · target ${g.targetDate}`}
              </div>
              <Field label="Planned monthly amount">
                <TextInput type="number" step="0.01" name="plannedMonthly" defaultValue={alloc?.plannedAmount ?? 0} required />
              </Field>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
          );
        })}
      </Card>
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: "good" | "warn" }) {
  const color = emphasis === "good" ? "text-brand-sage" : emphasis === "warn" ? "text-brand-accent" : "text-brand-dark";
  return (
    <div>
      <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">{label}</dt>
      <dd className={`font-medium ${color}`}>{value}</dd>
    </div>
  );
}
