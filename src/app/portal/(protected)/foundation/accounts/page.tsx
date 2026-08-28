import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { listFinancialAccounts } from "@/lib/repo/financialAccounts";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/enums";
import { SectionHeader, EmptyState } from "../shared";
import { addFinancialAccount, saveFinancialAccount, removeFinancialAccount } from "./actions";

function AccountFields({ defaults }: { defaults?: Awaited<ReturnType<typeof listFinancialAccounts>>[number] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
      <Field label="Nickname" required>
        <TextInput name="nickname" defaultValue={defaults?.nickname} required placeholder="e.g. Chase Checking" />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue={defaults?.type ?? ACCOUNT_TYPE_OPTIONS[0]}>
          {ACCOUNT_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Current balance" required>
        <TextInput type="number" step="0.01" name="currentBalance" defaultValue={defaults?.currentBalance} required />
      </Field>
      <Field label="Purpose" hint="Optional.">
        <TextInput name="purpose" defaultValue={defaults?.purpose ?? undefined} placeholder="e.g. Bills, everyday spending" />
      </Field>
    </div>
  );
}

export default async function AccountsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, accounts] = await Promise.all([isIntakeLocked(user.client.id), listFinancialAccounts(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Accounts" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">Checking, savings, credit, and investment accounts.</p>

      {accounts.length === 0 && <EmptyState>No accounts added yet.</EmptyState>}

      {accounts.map((a) => (
        <Card key={a.id} className="mb-4">
          <form action={saveFinancialAccount}>
            <input type="hidden" name="id" value={a.id} />
            <fieldset disabled={locked}>
              <AccountFields defaults={a} />
            </fieldset>
            {!locked && (
              <Button type="submit" variant="secondary">
                Save
              </Button>
            )}
          </form>
          {!locked && (
            <form action={removeFinancialAccount} className="mt-2 pt-2 border-t border-brand-pale">
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit" variant="danger">
                Remove
              </Button>
            </form>
          )}
        </Card>
      ))}

      {!locked && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Add Account</h2>
          <form action={addFinancialAccount}>
            <AccountFields />
            <Button type="submit">Add Account</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
