import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listIncomeSources, totalNormalizedMonthlyIncome } from "@/lib/repo/incomeSources";
import { INCOME_TYPE_OPTIONS, INCOME_PREDICTABILITY_OPTIONS } from "@/lib/enums";
import { FREQUENCY_OPTIONS } from "@/lib/calc";
import { SectionHeader, EmptyState } from "../shared";
import { addIncomeSource, saveIncomeSource, removeIncomeSource } from "./actions";

function IncomeFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listIncomeSources>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Person" required>
        <TextInput name="person" defaultValue={defaults?.person} required placeholder="e.g. You, Spouse" />
      </Field>
      <Field label="Source name" required>
        <TextInput name="sourceName" defaultValue={defaults?.sourceName} required placeholder="e.g. Main job" />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue={defaults?.type ?? INCOME_TYPE_OPTIONS[0]}>
          {INCOME_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Frequency">
        <Select name="frequency" defaultValue={defaults?.frequency ?? "Monthly"}>
          {FREQUENCY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Take-home amount" required>
        <TextInput type="number" step="0.01" name="takeHome" defaultValue={defaults?.takeHome} required />
      </Field>
      <Field label="Gross amount" hint="Optional.">
        <TextInput type="number" step="0.01" name="gross" defaultValue={defaults?.gross ?? undefined} />
      </Field>
      <Field label="Predictability">
        <Select name="predictability" defaultValue={defaults?.predictability ?? INCOME_PREDICTABILITY_OPTIONS[0]}>
          {INCOME_PREDICTABILITY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <div />
      <Field label="Typical variable amount" hint="Only needed if predictability is variable/irregular.">
        <TextInput type="number" step="0.01" name="variableTypical" defaultValue={defaults?.variableTypical ?? undefined} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Low">
          <TextInput type="number" step="0.01" name="variableLow" defaultValue={defaults?.variableLow ?? undefined} />
        </Field>
        <Field label="High">
          <TextInput type="number" step="0.01" name="variableHigh" defaultValue={defaults?.variableHigh ?? undefined} />
        </Field>
      </div>
    </div>
  );
}

export default async function IncomePage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, sources, normalizedMonthlyIncome] = await Promise.all([
    isIntakeLocked(user.client.id),
    listIncomeSources(user.client.id),
    totalNormalizedMonthlyIncome(user.client.id),
  ]);

  return (
    <div>
      <SectionHeader label="Income" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">
        Every income source. For variable income, the typical amount is used to calculate a normalized monthly
        figure — total: <strong>${normalizedMonthlyIncome.toFixed(2)}/mo</strong>.
      </p>

      {sources.length === 0 && <EmptyState>No income sources added yet.</EmptyState>}

      {sources.map((s) => (
        <Card key={s.id} className="mb-4">
          <form action={saveIncomeSource}>
            <input type="hidden" name="id" value={s.id} />
            <fieldset disabled={locked}>
              <IncomeFields defaults={s} />
            </fieldset>
            <p className="text-xs text-brand-slate/70 mb-3">Normalized: ${s.normalizedMonthly.toFixed(2)}/mo</p>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeIncomeSource} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={s.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Income Source</h2>
          <form action={addIncomeSource}>
            <IncomeFields />
            <Button type="submit">Add Source</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
