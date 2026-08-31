import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { computeAllocationSummary } from "@/lib/planCalc";
import { listAllocationLines, findEmergencyAllocation } from "@/lib/repo/allocationLines";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { Card, Field, TextInput, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import {
  addFlexCategory,
  saveFlexCategory,
  removeFlexCategory,
  saveEmergencyAllocation,
  saveSinkingFundAllocation,
} from "./actions";

export default async function AllocationPage(props: PageProps<"/coach/clients/[id]/plan/allocation">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const [summary, flexLines, efAllocation, ef, sinkingFunds, sinkingAllocations] = await Promise.all([
    computeAllocationSummary(clientId),
    listAllocationLines(clientId, "flex"),
    findEmergencyAllocation(clientId),
    findEmergencyFund(clientId),
    listSinkingFunds(clientId),
    listAllocationLines(clientId, "sinking"),
  ]);

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

      <Card>
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

      <div className="mt-6 flex gap-6 text-sm">
        <Link href={`/coach/clients/${clientId}/plan/debts`} className="text-brand-dark hover:underline">
          Debt Acceleration total: {money(summary.debtAccelerationTotal)} — set in Debt Strategy →
        </Link>
        <Link href={`/coach/clients/${clientId}/plan/goals`} className="text-brand-dark hover:underline">
          Goals total: {money(summary.goalsPlannedTotal)} — set in Savings &amp; Goals →
        </Link>
      </div>
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
