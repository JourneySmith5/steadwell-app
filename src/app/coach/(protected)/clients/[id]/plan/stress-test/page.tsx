import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { listIncomeSources } from "@/lib/repo/incomeSources";
import { computeStressTest } from "@/lib/planCalc";
import { Card, Button } from "@/components/ui";
import { PlanBuilderHeader, money } from "../shared";

export default async function StressTestPage(props: PageProps<"/coach/clients/[id]/plan/stress-test">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const searchParams = await props.searchParams;
  const rawExclude = searchParams.exclude;
  const excluded = rawExclude ? (Array.isArray(rawExclude) ? rawExclude : [rawExclude]) : [];

  const [allSources, result] = await Promise.all([listIncomeSources(clientId), computeStressTest(clientId, excluded)]);
  const sources = allSources.filter((s) => s.active);

  return (
    <div>
      <PlanBuilderHeader client={client} current="/stress-test" />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-2">Stage 6 — Stress Test</h2>
        <p className="text-sm text-brand-slate">
          Toggle an income source off to see the resulting shortfall against the plan as currently allocated.
          Nothing here is saved — it&apos;s a what-if calculator Coach uses to react, not a plan change.
        </p>
      </Card>

      <Card className="mb-6">
        <form method="get">
          {sources.length === 0 && <p className="text-sm text-brand-slate/70 italic mb-3">No active income sources.</p>}
          {sources.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-brand-slate mb-2">
              <input type="checkbox" name="exclude" value={s.id} defaultChecked={excluded.includes(s.id)} className="h-4 w-4" />
              Mark <span className="font-medium text-brand-dark">{s.sourceName}</span> ({s.person}) inactive —
              normally {money(s.normalizedMonthly)}/mo
            </label>
          ))}
          <Button type="submit" className="mt-2">
            Recalculate
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-brand-dark mb-3">Result</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          <Stat label="Baseline Cash Flow" value={money(result.baseline.availableMonthlyCashFlow)} />
          <Stat label="Income Removed" value={money(result.excludedMonthly)} />
          <Stat label="Stressed Cash Flow" value={money(result.stressedAvailable)} />
          <Stat
            label={result.shortfall < 0 ? "Shortfall" : "Surplus"}
            value={money(result.shortfall)}
            emphasis={result.shortfall < 0 ? "warn" : "good"}
          />
        </dl>
        <p className="text-xs text-brand-slate/70">
          Compared against the plan&apos;s current total planned outflow ({money(result.plannedOutflowTotal)}/mo)
          — Coach adjusts allocations in response to what this shows, not the other way around.
        </p>
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
