import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findPaymentById } from "@/lib/repo/payments";
import { Card, PageHeader, Button } from "@/components/ui";
import { completeTestPayment } from "./actions";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function TestConfirmPage(props: PageProps<"/agreement/[token]/checkout/confirm">) {
  const { token } = await props.params;
  const { paymentId } = await props.searchParams;
  const link = await findCheckoutLinkByToken(token);
  const payment = typeof paymentId === "string" ? await findPaymentById(paymentId) : undefined;

  if (!link || !payment || payment.clientId !== link.clientId) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <PageHeader title="Something Went Wrong" subtitle="We couldn't find that payment. Go back and try again." />
        </Card>
      </main>
    );
  }

  const boundComplete = completeTestPayment.bind(null, token, payment.id);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <div className="bg-brand-accent/20 border border-brand-accent text-brand-dark text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 mb-4 text-center">
          Test Mode — Stripe not configured, no real charge will happen
        </div>
        <PageHeader title="Complete Test Payment" subtitle={`Amount: ${dollars(payment.amountCents)}`} />
        <p className="text-sm text-brand-slate mb-4">
          On a real deployment, clicking pay would hand off to Stripe Checkout. Here, this button
          directly simulates a successful payment webhook so you can see everything downstream —
          account setup, 2FA, the client pipeline status — working for real.
        </p>
        <form action={boundComplete}>
          <Button type="submit" className="w-full">Complete Test Payment</Button>
        </form>
      </Card>
    </main>
  );
}
