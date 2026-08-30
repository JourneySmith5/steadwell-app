import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listDebts, debtSummary } from "@/lib/repo/debts";
import { DEBT_TYPE_OPTIONS } from "@/lib/enums";
import { SectionHeader, EmptyState, SectionFooterNav } from "../shared";
import { addDebt, saveDebt, removeDebt } from "./actions";

function DebtFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listDebts>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Creditor" required>
        <TextInput name="creditor" defaultValue={defaults?.creditor} required placeholder="e.g. Chase Sapphire" />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue={defaults?.type ?? DEBT_TYPE_OPTIONS[0]}>
          {DEBT_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Balance" required>
        <TextInput type="number" step="0.01" name="balance" defaultValue={defaults?.balance} required />
      </Field>
      <Field label="APR %" required>
        <TextInput type="number" step="0.01" name="apr" defaultValue={defaults?.apr} required />
      </Field>
      <Field label="Minimum payment" required>
        <TextInput type="number" step="0.01" name="minimumPayment" defaultValue={defaults?.minimumPayment} required />
      </Field>
      <Field label="Due date" hint="Optional.">
        <TextInput name="dueDate" defaultValue={defaults?.dueDate ?? undefined} />
      </Field>
      <Field label="Promo rate %" hint="Optional, if this debt has an intro rate.">
        <TextInput type="number" step="0.01" name="promoRate" defaultValue={defaults?.promoRate ?? undefined} />
      </Field>
      <Field label="Promo expires" hint="Optional.">
        <TextInput name="promoExpiresAt" defaultValue={defaults?.promoExpiresAt ?? undefined} />
      </Field>
    </div>
  );
}

export default async function DebtsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, debts, summary] = await Promise.all([
    isIntakeLocked(user.client.id),
    listDebts(user.client.id),
    debtSummary(user.client.id),
  ]);

  return (
    <div>
      <SectionHeader label="Debt" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">
        {summary.count === 0
          ? "No debts — that's a real answer, nothing to add here."
          : `${summary.count} debt${summary.count === 1 ? "" : "s"} · $${summary.totalBalance.toFixed(2)} total balance · $${summary.totalMinimumPayments.toFixed(2)} total minimum payments/mo.`}
      </p>

      {debts.length === 0 && <EmptyState>No debts added.</EmptyState>}

      {debts.map((d) => (
        <Card key={d.id} className="mb-4">
          <form action={saveDebt}>
            <input type="hidden" name="id" value={d.id} />
            <fieldset disabled={locked}>
              <DebtFields defaults={d} />
            </fieldset>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeDebt} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Debt</h2>
          <form action={addDebt}>
            <DebtFields />
            <Button type="submit">Add Debt</Button>
          </form>
        </Card>
      )}
      <SectionFooterNav currentHref="debts" />
    </div>
  );
}
