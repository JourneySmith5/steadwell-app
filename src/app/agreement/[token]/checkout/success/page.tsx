import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findClientById } from "@/lib/repo/clients";
import { findPaymentByCheckoutSessionId, findLatestPaymentForClient } from "@/lib/repo/payments";
import { fulfillFoundationPayment } from "@/lib/checkout";
import { getStripe } from "@/lib/stripe";
import { Card, PageHeader } from "@/components/ui";

export default async function CheckoutSuccessPage(props: PageProps<"/agreement/[token]/checkout/success">) {
  const { token } = await props.params;
  const { session_id } = await props.searchParams;
  const link = await findCheckoutLinkByToken(token);
  const client = link ? await findClientById(link.clientId) : undefined;

  if (!link || !client) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <PageHeader title="Link Invalid" />
        </Card>
      </main>
    );
  }

  // Real Stripe path: this page can render before the webhook has been
  // processed (they're two independent requests racing each other), so it
  // verifies and fulfills the payment itself too. fulfillFoundationPayment
  // is idempotent — whichever of the webhook or this page gets there first
  // does the real work, the other is a no-op.
  if (typeof session_id === "string") {
    const stripe = getStripe();
    const payment = await findPaymentByCheckoutSessionId(session_id);
    if (stripe && payment) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        await fulfillFoundationPayment(payment.id, (session.payment_intent as string) ?? undefined);
      }
    }
  }

  const payment = await findLatestPaymentForClient(client.id);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md text-center">
        <PageHeader
          title="Payment Received"
          subtitle={
            payment?.status === "paid"
              ? "Thank you — you're all set."
              : "We're finishing up processing your payment."
          }
        />
        <p className="text-sm text-brand-slate">
          You&apos;ll receive an email shortly with a link to create your account password and set up
          two-factor authentication. That email is reviewed by hand before it goes out, so it may take
          a little while.
        </p>
      </Card>
    </main>
  );
}
