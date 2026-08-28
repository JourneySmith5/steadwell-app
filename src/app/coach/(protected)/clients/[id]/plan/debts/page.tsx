import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { listDebts } from "@/lib/repo/debts";
import { findDebtDecisionByDebtId } from "@/lib/repo/debtDecisions";
import { generateDebtInsights } from "@/lib/planCalc";
import { replaceInsights, listInsights } from "@/lib/repo/insights";
import { DEBT_STRATEGY_OPTIONS } from "@/lib/enums";
import { Card, Field, TextInput, Select, TextArea, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";
import { saveDebtDecision } from "./actions";

export default async function DebtStrategyPage(props: PageProps<"/coach/clients/[id]/plan/debts">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const debts = await listDebts(clientId);

  // §7: insights are recomputed (not accumulated) every time this page loads.
  await replaceInsights(clientId, "debt", await generateDebtInsights(clientId));
  const insights = await listInsights(clientId, "debt");
  const decisions = new Map((await Promise.all(debts.map((d) => findDebtDecisionByDebtId(d.id)))).map((decision, idx) => [debts[idx].id, decision]));

  return (
    <div>
      <PlanBuilderHeader client={client} current="/debts" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-2">Stage 4 — Debt Strategy</h2>
        <p className="text-sm text-brand-slate">
          Coach sets Priority, Planned Payment, and Strategy for every debt. The system calculates the resulting
          payoff trajectory — nothing here pre-fills a plan value.
        </p>
      </Card>

      {insights.length > 0 && (
        <Card className="mb-6 bg-brand-pale/30">
          <h3 className="text-sm font-medium text-brand-dark mb-2">Coach-Only Insights</h3>
          <ul className="text-sm text-brand-slate space-y-1 list-disc list-inside">
            {insights.map((i) => (
              <li key={i.id}>{i.text}</li>
            ))}
          </ul>
          <p className="text-xs text-brand-slate/60 mt-2">
            Informational only — never shown to the client, never pre-fills a value below.
          </p>
        </Card>
      )}

      {debts.length === 0 && (
        <Card>
          <p className="text-sm text-brand-slate/70 italic">No debts entered in Foundation Intake.</p>
        </Card>
      )}

      {debts.map((d, idx) => {
        const decision = decisions.get(d.id);
        return (
          <Card key={d.id} className="mb-4">
            <div className="mb-3">
              <h3 className="font-heading text-base text-brand-dark">{d.creditor}</h3>
              <p className="text-xs text-brand-slate/70">
                {d.type} · Balance {money(d.balance)} · APR {d.apr}% · Minimum {money(d.minimumPayment)}
              </p>
            </div>
            <form action={saveDebtDecision.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <input type="hidden" name="debtId" value={d.id} />
              <Field label="Priority" hint="1 = highest priority.">
                <TextInput type="number" name="priority" defaultValue={decision?.priority ?? idx + 1} required />
              </Field>
              <Field label="Strategy">
                <Select name="strategy" defaultValue={decision?.strategy ?? DEBT_STRATEGY_OPTIONS[0]}>
                  {DEBT_STRATEGY_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Planned monthly payment">
                <TextInput type="number" step="0.01" name="plannedPayment" defaultValue={decision?.plannedPayment ?? d.minimumPayment} required />
              </Field>
              <div />
              <div className="sm:col-span-2">
                <Field label="Rationale" hint="Coach's reasoning for this strategy — on record.">
                  <TextArea name="rationale" rows={2} defaultValue={decision?.rationale ?? ""} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </div>
            </form>
            {decision && (
              <p className="text-xs text-brand-slate/70 mt-3 pt-3 border-t border-brand-pale">
                {decision.monthsToPayoff != null
                  ? `Projected payoff: ${decision.monthsToPayoff} month${decision.monthsToPayoff === 1 ? "" : "s"}, total interest ${money(decision.totalInterest ?? 0)}.`
                  : "This planned payment doesn't cover the monthly interest — this debt will never pay off at this amount."}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
