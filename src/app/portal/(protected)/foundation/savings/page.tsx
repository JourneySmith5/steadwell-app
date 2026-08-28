import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listSavings } from "@/lib/repo/savings";
import { SectionHeader, EmptyState } from "../shared";
import { addSavings, saveSavingsRow, removeSavings } from "./actions";

function SavingsFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listSavings>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Name" required>
        <TextInput name="name" defaultValue={defaults?.name} required placeholder="e.g. Vacation fund" />
      </Field>
      <Field label="Current balance" required>
        <TextInput type="number" step="0.01" name="currentBalance" defaultValue={defaults?.currentBalance} required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Purpose" hint="Optional.">
          <TextInput name="purpose" defaultValue={defaults?.purpose ?? undefined} />
        </Field>
      </div>
    </div>
  );
}

export default async function SavingsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, savings] = await Promise.all([isIntakeLocked(user.client.id), listSavings(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Savings" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">General savings, separate from the Emergency Fund.</p>

      {savings.length === 0 && <EmptyState>No savings accounts added.</EmptyState>}

      {savings.map((s) => (
        <Card key={s.id} className="mb-4">
          <form action={saveSavingsRow}>
            <input type="hidden" name="id" value={s.id} />
            <fieldset disabled={locked}>
              <SavingsFields defaults={s} />
            </fieldset>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeSavings} className="mt-2 pt-2 border-t border-brand-pale">
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
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Savings</h2>
          <form action={addSavings}>
            <SavingsFields />
            <Button type="submit">Add Savings</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
