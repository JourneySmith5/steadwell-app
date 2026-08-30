import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listBills, totalMonthlyBills } from "@/lib/repo/bills";
import { BILL_FIXED_OR_VARIABLE_OPTIONS } from "@/lib/enums";
import { FREQUENCY_OPTIONS } from "@/lib/calc";
import { SectionHeader, EmptyState, SectionFooterNav } from "../shared";
import { addBill, saveBill, removeBill } from "./actions";

function BillFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listBills>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Name" required>
        <TextInput name="name" defaultValue={defaults?.name} required placeholder="e.g. Rent, Electric" />
      </Field>
      <Field label="Category" hint="Free text, e.g. Housing, Utilities.">
        <TextInput name="category" defaultValue={defaults?.category} placeholder="e.g. Housing" />
      </Field>
      <Field label="Amount" required>
        <TextInput type="number" step="0.01" name="amount" defaultValue={defaults?.amount} required />
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
      <Field label="Due date" hint="Optional, e.g. the 1st.">
        <TextInput name="dueDate" defaultValue={defaults?.dueDate ?? undefined} />
      </Field>
      <Field label="Fixed or variable">
        <Select name="fixedOrVariable" defaultValue={defaults?.fixedOrVariable ?? BILL_FIXED_OR_VARIABLE_OPTIONS[0]}>
          {BILL_FIXED_OR_VARIABLE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export default async function BillsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, bills, monthlyBillsTotal] = await Promise.all([
    isIntakeLocked(user.client.id),
    listBills(user.client.id),
    totalMonthlyBills(user.client.id),
  ]);

  return (
    <div>
      <SectionHeader label="Regular Bills" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">
        Recurring bills, normalized to a monthly figure — total: <strong>${monthlyBillsTotal.toFixed(2)}/mo</strong>.
      </p>

      {bills.length === 0 && <EmptyState>No bills added yet.</EmptyState>}

      {bills.map((b) => (
        <Card key={b.id} className="mb-4">
          <form action={saveBill}>
            <input type="hidden" name="id" value={b.id} />
            <fieldset disabled={locked}>
              <BillFields defaults={b} />
            </fieldset>
            <p className="text-xs text-brand-slate/70 mb-3">Monthly equivalent: ${b.monthlyEquivalent.toFixed(2)}</p>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeBill} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={b.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Bill</h2>
          <form action={addBill}>
            <BillFields />
            <Button type="submit">Add Bill</Button>
          </form>
        </Card>
      )}
      <SectionFooterNav currentHref="bills" />
    </div>
  );
}
