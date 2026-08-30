import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, TextArea, Select, CheckboxField } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listGoals } from "@/lib/repo/goals";
import { GOAL_PRIORITY_OPTIONS } from "@/lib/enums";
import { SectionHeader, EmptyState, SectionFooterNav } from "../shared";
import { addGoal, saveGoal, removeGoal } from "./actions";

function GoalFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listGoals>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Goal name" required>
        <TextInput name="name" defaultValue={defaults?.name} required placeholder="e.g. Pay off credit cards" />
      </Field>
      <Field label="Priority">
        <Select name="priority" defaultValue={defaults?.priority ?? GOAL_PRIORITY_OPTIONS[1]}>
          {GOAL_PRIORITY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Target amount" required>
        <TextInput type="number" step="0.01" name="target" defaultValue={defaults?.target} required />
      </Field>
      <Field label="Current amount" required>
        <TextInput type="number" step="0.01" name="currentAmount" defaultValue={defaults?.currentAmount ?? 0} required />
      </Field>
      <div className="sm:col-span-2 -mt-2">
        <CheckboxField label="Has a target deadline" name="hasDeadline" defaultChecked={defaults?.hasDeadline} />
      </div>
      <Field label="Target date" hint="If it has a deadline.">
        <TextInput name="targetDate" defaultValue={defaults?.targetDate ?? undefined} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Why this goal?" hint="Optional.">
          <TextArea name="why" rows={2} defaultValue={defaults?.why ?? undefined} />
        </Field>
      </div>
    </div>
  );
}

export default async function GoalsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, goals] = await Promise.all([isIntakeLocked(user.client.id), listGoals(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Financial Goals" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">
        At least one goal is required before Foundation Intake can be submitted.
      </p>

      {goals.length === 0 && <EmptyState>No goals added yet.</EmptyState>}

      {goals.map((g) => (
        <Card key={g.id} className="mb-4">
          <form action={saveGoal}>
            <input type="hidden" name="id" value={g.id} />
            <fieldset disabled={locked}>
              <GoalFields defaults={g} />
            </fieldset>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeGoal} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={g.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Goal</h2>
          <form action={addGoal}>
            <GoalFields />
            <Button type="submit">Add Goal</Button>
          </form>
        </Card>
      )}
      <SectionFooterNav currentHref="goals" />
    </div>
  );
}
