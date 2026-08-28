import { requireClient } from "@/lib/dal";
import { Card, PageHeader, Button } from "@/components/ui";
import { listPaymentsForClient } from "@/lib/repo/payments";
import { findSubscriptionByClientId } from "@/lib/repo/subscriptions";
import { ACCOUNTABILITY_TIERS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/enums";
import { STRIPE_CONFIGURED } from "@/lib/stripe";
import { manageBilling } from "./actions";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function BillingPage() {
  const user = await requireClient();
  const client = user.client;

  if (!client) {
    return (
      <div>
        <PageHeader title="Billing" />
        <Card>
          <p className="text-sm text-brand-slate">No client record found for this account.</p>
        </Card>
      </div>
    );
  }

  const [payments, subscription] = await Promise.all([
    listPaymentsForClient(client.id),
    findSubscriptionByClientId(client.id),
  ]);
  const tier = subscription ? ACCOUNTABILITY_TIERS.find((t) => t.id === subscription.tier) : undefined;
  const canManage = STRIPE_CONFIGURED && !!subscription?.stripeSubscriptionId;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Payment and subscription status." />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Current Status</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-brand-slate">Financial Foundation</dt>
            <dd className="text-brand-dark font-medium">One-time $399.00</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-slate">Accountability</dt>
            <dd className="text-brand-dark font-medium">
              {subscription && tier
                ? `${tier.label} — ${dollars(tier.priceCents)}/mo (${SUBSCRIPTION_STATUS_LABELS[subscription.status]})`
                : "Not enrolled"}
            </dd>
          </div>
        </dl>

        {canManage ? (
          <form action={manageBilling} className="mt-4">
            <Button type="submit" variant="secondary">
              Manage Payment Method
            </Button>
          </form>
        ) : (
          <p className="text-xs text-brand-slate/60 mt-4 border-t border-brand-pale pt-3">
            {STRIPE_CONFIGURED
              ? "Payment-method management (Stripe's hosted Billing Portal) becomes available once you're enrolled in Accountability."
              : "Stripe isn't configured yet on this deployment — real payment-method management via Stripe's hosted Billing Portal will appear here once it is. See README “Before this goes live.”"}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Payment History</h2>
        {payments.length === 0 && <p className="text-sm text-brand-slate">No payments yet.</p>}
        <ul className="divide-y divide-brand-pale">
          {payments.map((p) => (
            <li key={p.id} className="py-2 text-sm flex justify-between">
              <span className="text-brand-dark">
                {p.type === "foundation" ? "Financial Foundation" : p.type}
                {p.discountCode && <span className="text-brand-slate"> (code: {p.discountCode})</span>}
              </span>
              <span className="text-brand-slate">
                {dollars(p.amountCents)} · {p.status} · {new Date(p.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
