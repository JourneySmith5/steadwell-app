import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select, CheckboxField } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listHouseholdMembers } from "@/lib/repo/householdMembers";
import { HOUSEHOLD_RELATIONSHIP_OPTIONS } from "@/lib/enums";
import { SectionHeader, EmptyState, SectionFooterNav } from "../shared";
import { addHouseholdMember, saveHouseholdMember, removeHouseholdMember, saveDateOfBirth } from "./actions";

export default async function HouseholdPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, members] = await Promise.all([isIntakeLocked(user.client.id), listHouseholdMembers(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Household" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">Everyone financially included in this plan.</p>

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Your Information</h2>
        <form action={saveDateOfBirth} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Date of birth" hint="Used to apply your birthday-month discount, if you have one.">
            <TextInput type="date" name="dateOfBirth" defaultValue={user.client.dateOfBirth ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </div>
        </form>
      </Card>

      {members.length === 0 && <EmptyState>No household members added yet.</EmptyState>}

      {members.map((m) => (
        <Card key={m.id} className="mb-4">
          <form action={saveHouseholdMember} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <input type="hidden" name="id" value={m.id} />
            <Field label="Name" required>
              <TextInput name="name" defaultValue={m.name} required disabled={locked} />
            </Field>
            <Field label="Relationship">
              <Select name="relationship" defaultValue={m.relationship} disabled={locked}>
                {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-6 -mt-2">
              <CheckboxField label="Income included" name="incomeIncluded" defaultChecked={m.incomeIncluded} disabled={locked} />
              <CheckboxField label="Expenses included" name="expensesIncluded" defaultChecked={m.expensesIncluded} disabled={locked} />
            </div>
            {!locked && (
              <div className="sm:col-span-2">
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </div>
            )}
          </form>
          {!locked && (
            <form action={removeHouseholdMember} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Household Member</h2>
          <form action={addHouseholdMember} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Name" required>
              <TextInput name="name" required />
            </Field>
            <Field label="Relationship">
              <Select name="relationship" defaultValue={HOUSEHOLD_RELATIONSHIP_OPTIONS[0]}>
                {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-6 -mt-2">
              <CheckboxField label="Income included" name="incomeIncluded" defaultChecked />
              <CheckboxField label="Expenses included" name="expensesIncluded" defaultChecked />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add Member</Button>
            </div>
          </form>
        </Card>
      )}
      <SectionFooterNav currentHref="household" />
    </div>
  );
}
