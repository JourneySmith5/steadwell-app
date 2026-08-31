import Link from "next/link";
import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findClientById } from "@/lib/repo/clients";
import { computeFoundationPriceCents } from "@/lib/checkout";
import { STRIPE_CONFIGURED } from "@/lib/stripe";
import { Card, PageHeader, Button, TextInput } from "@/components/ui";
import { startCheckout } from "./actions";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CheckoutPage(props: PageProps<"/agreement/[token]/checkout">) {
  const { token } = await props.params;
  const { code } = await props.searchParams;
  const codeParam = typeof code === "string" ? code : undefined;

  const link = await findCheckoutLinkByToken(token);
  const client = link ? await findClientById(link.clientId) : undefined;

  if (!link || !client || client.status !== "payment_pending") {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <PageHeader title="Not Ready For Payment" subtitle="You'll need to accept the agreement first." />
          <Link href={`/agreement/${token}`}>
            <Button variant="secondary">Back to Agreement</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const price = await computeFoundationPriceCents(codeParam, client);
  const boundStartCheckout = startCheckout.bind(null, token);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <PageHeader title="Financial Foundation — Payment" subtitle="One-time fee, due before Foundation Intake begins." />

        <dl className="text-sm space-y-2 mb-4">
          <div className="flex justify-between">
            <dt className="text-brand-slate">Financial Foundation</dt>
            <dd className="text-brand-slate">$399.00</dd>
          </div>
          {price.appliedCodes.map((a) => (
            <div key={a.code} className="flex justify-between text-brand-sage">
              <dt>{a.code} ({a.percentOff}% off)</dt>
              <dd>-{dollars(Math.round(39900 * (a.percentOff / 100)))}</dd>
            </div>
          ))}
          <div className="flex justify-between font-semibold text-brand-dark border-t border-brand-pale pt-2">
            <dt>Total due today</dt>
            <dd>{dollars(price.amountCents)}</dd>
          </div>
        </dl>

        {/* Plain GET form — re-navigates this page with ?code=, no JS or
            server action needed just to preview a discount. */}
        <form method="get" className="flex gap-2 mb-2">
          <TextInput name="code" placeholder="Discount code (optional)" defaultValue={codeParam ?? ""} className="flex-1" />
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
        {price.invalidCode && <p className="text-sm text-red-700 mb-4">That code isn&apos;t valid or isn&apos;t currently active.</p>}

        <form action={boundStartCheckout}>
          <input type="hidden" name="code" value={codeParam ?? ""} />
          <Button type="submit" className="w-full mt-2">
            {STRIPE_CONFIGURED ? "Pay with Stripe" : "Continue (Test Mode)"}
          </Button>
        </form>

        {!STRIPE_CONFIGURED && (
          <p className="text-xs text-brand-slate/60 mt-3 border-t border-brand-pale pt-3">
            Stripe isn&apos;t configured yet on this deployment — this will walk you through a test
            payment instead of a real charge. See README &quot;Before this goes live.&quot;
          </p>
        )}
      </Card>
    </main>
  );
}
