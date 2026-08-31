import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { ensurePlanStarted } from "@/lib/plan";
import { computeBaseline } from "@/lib/planCalc";
import { listIncomeSources } from "@/lib/repo/incomeSources";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listSavings } from "@/lib/repo/savings";
import { listStatements } from "@/lib/repo/statements";
import { formatStatementMonth } from "@/lib/statementMonths";
import { Card, Field, TextInput, TextArea, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "./shared";
import { saveBaseline } from "./actions";

async function incomeStability(clientId: string): Promise<string> {
  const sources = (await listIncomeSources(clientId)).filter((s) => s.active);
  if (sources.length === 0) return "No income sources entered yet.";
  if (sources.some((s) => s.predictability === "Highly variable" || s.predictability === "Irregular or occasional")) {
    return "Highly variable";
  }
  if (sources.some((s) => s.predictability === "Usually consistent but varies")) return "Somewhat variable";
  return "Stable";
}

export default async function PlanBaselinePage(props: PageProps<"/coach/clients/[id]/plan">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  await ensurePlanStarted(clientId);
  const freshClient = (await findClientById(clientId))!;

  const [baseline, ef, sinkingFunds, savings, stability, statements] = await Promise.all([
    computeBaseline(clientId),
    findEmergencyFund(clientId),
    listSinkingFunds(clientId),
    listSavings(clientId),
    incomeStability(clientId),
    listStatements(clientId),
  ]);

  return (
    <div>
      <PlanBuilderHeader client={freshClient} current="" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-1">Stage 1 — Financial Baseline</h2>
        <p className="text-sm text-brand-slate mb-4">
          Pulled from Foundation Intake, plus Coach&apos;s estimate of typical additional spending. This figure
          is entered by Coach, not calculated automatically — review the statements below yourself and use your
          judgment; nothing in them is read or summarized by AI.
        </p>

        {statements.length > 0 && (
          <div className="bg-brand-pale/40 rounded-md px-4 py-3 mb-4">
            <p className="text-xs font-medium text-brand-dark uppercase tracking-wide mb-2">Uploaded Statements</p>
            <ul className="divide-y divide-brand-pale/70">
              {statements.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-brand-dark">
                    {s.accountNickname}
                    {formatStatementMonth(s.month) ? ` — ${formatStatementMonth(s.month)}` : ""}
                    {s.originalFilename && (
                      <span className="text-brand-slate/60"> ({s.originalFilename})</span>
                    )}
                  </span>
                  <a
                    href={`/api/statements/${s.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-dark underline hover:no-underline shrink-0 ml-3"
                  >
                    Preview
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {statements.length === 0 && (
          <p className="text-sm text-brand-slate/70 italic mb-4">Client hasn&apos;t uploaded any statements yet.</p>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label="Normalized Monthly Income" value={money(baseline.normalizedMonthlyIncome)} />
          <Stat label="Recurring Bills" value={money(baseline.monthlyBills)} />
          <Stat label="Debt Minimums" value={money(baseline.debtMinimums)} />
          <Stat label="Historical Spending" value={money(baseline.historicalSpendingMonthly)} />
        </dl>
        <div className="bg-brand-pale/40 rounded-md px-4 py-3 mb-2">
          <span className="text-sm text-brand-dark font-medium">If nothing changes: </span>
          <span className="text-lg font-heading text-brand-dark">{money(baseline.availableMonthlyCashFlow)}</span>
          <span className="text-xs text-brand-slate/70 block mt-0.5">
            Income minus bills, debt minimums, and historical spending — what&apos;s actually left over at the end
            of the month under current habits.
          </span>
        </div>
        <div className="bg-brand-pale/40 rounded-md px-4 py-3 mb-4">
          <span className="text-sm text-brand-dark font-medium">Income Available to Plan: </span>
          <span className="text-lg font-heading text-brand-dark">{money(baseline.incomeAvailableToPlan)}</span>
          <span className="text-xs text-brand-slate/70 block mt-0.5">
            Income minus only bills and debt minimums — the real pool Stage 3&apos;s Cash-Flow Allocation Workspace
            divides up. Historical spending isn&apos;t subtracted here; redirecting it is the plan&apos;s job, not
            a given.
          </span>
        </div>

        <form action={saveBaseline.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Historical spending average (monthly)" hint="Coach's estimate, based on your own review of the client's statements — not calculated or read by AI.">
            <TextInput
              type="number"
              step="0.01"
              name="historicalSpendingMonthly"
              defaultValue={freshClient.planHistoricalSpendingMonthly ?? 0}
            />
          </Field>
          <div />
          <div className="sm:col-span-2">
            <Field label="General rationale" hint="Coach's professional reasoning for material plan decisions — kept on record, never shown to the client verbatim.">
              <TextArea name="generalRationale" rows={3} defaultValue={freshClient.planGeneralRationale ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-1">Stage 2 — Stability</h2>
        <p className="text-sm text-brand-slate mb-4">Context for what needs attention first — not editable here.</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Income Stability" value={stability} />
          <Stat label="Emergency Fund" value={ef ? `${money(ef.currentBalance)} of ${money(ef.target)}` : "Not entered"} />
          <Stat label="EF Gap" value={ef ? money(Math.max(0, ef.target - ef.currentBalance)) : "—"} />
        </dl>
        <h3 className="text-sm font-medium text-brand-dark mb-2">Sinking Funds (known upcoming expenses)</h3>
        {sinkingFunds.length === 0 ? (
          <p className="text-sm text-brand-slate/70 italic mb-4">None entered.</p>
        ) : (
          <ul className="text-sm text-brand-slate mb-4 space-y-1">
            {sinkingFunds.map((f) => (
              <li key={f.id}>
                {f.name} — {money(f.currentBalance)} of {money(f.targetAmount)}, target {f.targetDate}
              </li>
            ))}
          </ul>
        )}
        <h3 className="text-sm font-medium text-brand-dark mb-2">Savings</h3>
        {savings.length === 0 ? (
          <p className="text-sm text-brand-slate/70 italic">None entered.</p>
        ) : (
          <ul className="text-sm text-brand-slate space-y-1">
            {savings.map((s) => (
              <li key={s.id}>
                {s.name} — {money(s.currentBalance)}
                {s.purpose && ` (${s.purpose})`}
              </li>
            ))}
          </ul>
        )}
      </Card>
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
