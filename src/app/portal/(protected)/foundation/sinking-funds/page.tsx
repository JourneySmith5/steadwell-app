import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, TextArea } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { SectionHeader, EmptyState } from "../shared";
import { addSinkingFund, saveSinkingFund, removeSinkingFund } from "./actions";

function SinkingFundFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listSinkingFunds>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Name" required>
        <TextInput name="name" defaultValue={defaults?.name} required placeholder="e.g. Car repairs, Holidays" />
      </Field>
      <Field label="Target date">
        <TextInput name="targetDate" defaultValue={defaults?.targetDate} placeholder="e.g. December 2026" />
      </Field>
      <Field label="Target amount" required>
        <TextInput type="number" step="0.01" name="targetAmount" defaultValue={defaults?.targetAmount} required />
      </Field>
      <Field label="Current balance" required>
        <TextInput type="number" step="0.01" name="currentBalance" defaultValue={defaults?.currentBalance} required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes" hint="Optional.">
          <TextArea name="notes" rows={2} defaultValue={defaults?.notes ?? undefined} />
        </Field>
      </div>
    </div>
  );
}

export default async function SinkingFundsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, funds] = await Promise.all([isIntakeLocked(user.client.id), listSinkingFunds(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Sinking Funds" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">Money set aside for specific, planned future expenses.</p>

      {funds.length === 0 && <EmptyState>No sinking funds added.</EmptyState>}

      {funds.map((f) => (
        <Card key={f.id} className="mb-4">
          <form action={saveSinkingFund}>
            <input type="hidden" name="id" value={f.id} />
            <fieldset disabled={locked}>
              <SinkingFundFields defaults={f} />
            </fieldset>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeSinkingFund} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={f.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Sinking Fund</h2>
          <form action={addSinkingFund}>
            <SinkingFundFields />
            <Button type="submit">Add Sinking Fund</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
