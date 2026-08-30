import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, TextArea } from "@/components/ui";
import { isIntakeLocked } from "@/lib/repo/foundationIntake";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { SectionHeader, SectionFooterNav } from "../shared";
import { saveEmergencyFund } from "./actions";

export default async function EmergencyFundPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const [locked, ef] = await Promise.all([isIntakeLocked(user.client.id), findEmergencyFund(user.client.id)]);

  return (
    <div>
      <SectionHeader label="Emergency Fund" locked={locked} />
      <p className="text-sm text-brand-slate mb-4">
        One record — Coach may revise the target during Plan Build; this is your starting point.
      </p>
      <Card>
        <form action={saveEmergencyFund}>
          <fieldset disabled={locked} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Current balance" required>
              <TextInput type="number" step="0.01" name="currentBalance" defaultValue={ef?.currentBalance ?? 0} required />
            </Field>
            <Field label="Target" required>
              <TextInput type="number" step="0.01" name="target" defaultValue={ef?.target ?? 0} required />
            </Field>
            <Field label="Target date" hint="Optional.">
              <TextInput name="targetDate" defaultValue={ef?.targetDate ?? undefined} />
            </Field>
            <div />
            <div className="sm:col-span-2">
              <Field label="Notes" hint="Optional.">
                <TextArea name="notes" rows={3} defaultValue={ef?.notes ?? undefined} />
              </Field>
            </div>
          </fieldset>
          {!locked && <Button type="submit">Save</Button>}
        </form>
      </Card>
      <SectionFooterNav currentHref="emergency-fund" />
    </div>
  );
}
