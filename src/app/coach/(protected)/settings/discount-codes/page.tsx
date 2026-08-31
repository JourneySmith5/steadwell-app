import { requireCoach } from "@/lib/dal";
import { listDiscountCodes } from "@/lib/repo/discountCodes";
import { Card, PageHeader, Field, TextInput, Button, ErrorText } from "@/components/ui";
import { toggleDiscountCode, saveDiscountCode, addDiscountCode, runBirthdaySweepNow } from "./actions";

const AUTOMATIC_CODES = new Set(["THANKYOU15", "BIRTHDAY20"]);

export default async function DiscountCodesPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireCoach();
  const [codes, { error }] = await Promise.all([listDiscountCodes(), props.searchParams]);

  return (
    <div>
      <PageHeader
        title="Discount Codes"
        subtitle="Add codes at will — seasonal sales, promos, whatever — and toggle them on/off whenever you please. Disabled by default so a new code never goes live before you mean it to."
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Card className="mb-6 p-0 overflow-hidden">
        <ul className="divide-y divide-brand-pale">
          {codes.map((c) => (
            <li key={c.id} className="px-6 py-4">
              {AUTOMATIC_CODES.has(c.code) && (
                <p className="text-xs text-brand-slate/60 mb-2">
                  Automatic — clients never type this in. {c.code === "THANKYOU15"
                    ? "Applies itself to a client's first 3 Accountability billing cycles if they enroll within 24 hours of you sending their Foundation Review completion email."
                    : "Applies itself during a client's birth month — to the Foundation fee if their date of birth is on file by then, and to their Accountability bill via the daily sweep below."}
                </p>
              )}
              <form action={saveDiscountCode.bind(null, c.id)} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <Field label="Code">
                  <TextInput name="code" defaultValue={c.code} required maxLength={40} className="uppercase" />
                </Field>
                <Field label="Percent off">
                  <TextInput name="percentOff" type="number" min={1} max={100} defaultValue={c.percentOff} required />
                </Field>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${c.enabled ? "text-brand-sage" : "text-brand-slate/60"}`}>
                    {c.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Button type="submit" variant="secondary">
                    Save
                  </Button>
                </div>
              </form>
              <form action={toggleDiscountCode.bind(null, c.id, !c.enabled)} className="mt-2">
                <Button type="submit" variant={c.enabled ? "danger" : "primary"} className="text-xs px-2 py-1">
                  {c.enabled ? "Disable" : "Enable"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg text-brand-dark mb-1">Birthday Discount Sweep</h2>
            <p className="text-xs text-brand-slate/60">
              Runs automatically every day. This button runs it on demand — useful for checking BIRTHDAY20
              actually lands on an active Accountability subscription without waiting on the schedule.
            </p>
          </div>
          <form action={runBirthdaySweepNow}>
            <Button type="submit" variant="secondary">
              Run Now
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Add a New Code</h2>
        <form action={addDiscountCode} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="Code">
            <TextInput name="code" required maxLength={40} placeholder="e.g. HOLIDAY25" className="uppercase" />
          </Field>
          <Field label="Percent off">
            <TextInput name="percentOff" type="number" min={1} max={100} required placeholder="25" />
          </Field>
          <div>
            <Button type="submit">Add Code</Button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-brand-slate/60 mt-3">
        Disabling a code stops it from being applied to new checkouts — it doesn&apos;t alter any
        payment that already happened.
      </p>
    </div>
  );
}
