import { requireCoach } from "@/lib/dal";
import { listDiscountCodes } from "@/lib/repo/discountCodes";
import { Card, PageHeader, Button } from "@/components/ui";
import { toggleDiscountCode } from "./actions";

export default async function DiscountCodesPage() {
  await requireCoach();
  const codes = await listDiscountCodes();

  return (
    <div>
      <PageHeader title="Discount Codes" subtitle="Disabled by default — turn one on only when you're actually offering it." />
      <Card>
        <ul className="divide-y divide-brand-pale">
          {codes.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-dark">{c.code}</p>
                <p className="text-sm text-brand-slate">{c.percentOff}% off the Financial Foundation fee</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${c.enabled ? "text-brand-sage" : "text-brand-slate/60"}`}>
                  {c.enabled ? "Enabled" : "Disabled"}
                </span>
                <form action={toggleDiscountCode.bind(null, c.id, !c.enabled)}>
                  <Button type="submit" variant={c.enabled ? "danger" : "secondary"}>
                    {c.enabled ? "Disable" : "Enable"}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-brand-slate/60 mt-3">
        Disabling a code stops it from being applied to new checkouts — it doesn&apos;t alter any
        payment that already happened.
      </p>
    </div>
  );
}
