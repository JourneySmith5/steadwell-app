import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { listGoals } from "@/lib/repo/goals";
import { listAllocationLines } from "@/lib/repo/allocationLines";
import { generateGoalInsights, computeGoalCompletion } from "@/lib/planCalc";
import { Card, Field, TextInput, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import { saveGoalAllocation } from "./actions";

export default async function GoalsAllocationPage(props: PageProps<"/coach/clients/[id]/plan/goals">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const [goals, allocations, insights] = await Promise.all([
    listGoals(clientId),
    listAllocationLines(clientId, "goal"),
    generateGoalInsights(clientId),
  ]);

  return (
    <div>
      <PlanBuilderHeader client={client} current="/goals" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-2">Stage 5 — Savings &amp; Goals Allocation</h2>
        <p className="text-sm text-brand-slate">
          Coach sets a planned monthly amount per goal. The system calculates a projected completion date. Planned
          amount can also be quick-edited from the Cash-Flow Allocation Workspace — both update the same number.
        </p>
      </Card>

      {insights.length > 0 && (
        <Card className="mb-6 bg-brand-pale/30">
          <h3 className="text-sm font-medium text-brand-dark mb-2">Coach-Only Insights</h3>
          <ul className="text-sm text-brand-slate space-y-1 list-disc list-inside">
            {insights.map((i, idx) => (
              <li key={idx}>{i.text}</li>
            ))}
          </ul>
          <p className="text-xs text-brand-slate/60 mt-2">Informational only — never shown to the client.</p>
        </Card>
      )}

      {goals.length === 0 && (
        <Card>
          <p className="text-sm text-brand-slate/70 italic">No goals entered in Foundation Intake.</p>
        </Card>
      )}

      {goals.map((g) => {
        const allocation = allocations.find((a) => a.linkedGoalId === g.id);
        const planned = allocation?.plannedAmount ?? 0;
        const completion = computeGoalCompletion(g.target, g.currentAmount, planned);
        return (
          <Card key={g.id} className="mb-4">
            <div className="mb-3">
              <h3 className="font-heading text-base text-brand-dark">{g.name}</h3>
              <p className="text-xs text-brand-slate/70">
                {g.priority} · {money(g.currentAmount)} of {money(g.target)}
                {g.hasDeadline && g.targetDate && ` · target ${g.targetDate}`}
              </p>
              {g.why && <p className="text-xs text-brand-slate/70 mt-1">&ldquo;{g.why}&rdquo;</p>}
            </div>
            <form action={saveGoalAllocation.bind(null, clientId)} className="flex items-end gap-3">
              <input type="hidden" name="goalId" value={g.id} />
              <Field label="Planned monthly amount">
                <TextInput type="number" step="0.01" name="plannedMonthly" defaultValue={planned} required />
              </Field>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
            <p className="text-xs text-brand-slate/70 mt-3 pt-3 border-t border-brand-pale">
              {completion.projectedDate
                ? `Projected completion: ${completion.projectedDate} (${completion.monthsToComplete} month${completion.monthsToComplete === 1 ? "" : "s"}).`
                : "No planned amount set — no projection yet."}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
