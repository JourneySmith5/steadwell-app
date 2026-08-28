import Link from "next/link";
import { findCheckoutLinkByToken } from "@/lib/repo/checkoutLinks";
import { findClientById } from "@/lib/repo/clients";
import { findAgreementAcceptanceByClientId } from "@/lib/repo/agreements";
import { Card, PageHeader, Button } from "@/components/ui";
import { AgreementText } from "@/components/AgreementText";
import { AgreementAcceptForm } from "@/components/AgreementAcceptForm";

export default async function AgreementPage(props: PageProps<"/agreement/[token]">) {
  const { token } = await props.params;
  const link = await findCheckoutLinkByToken(token);
  const client = link ? await findClientById(link.clientId) : undefined;

  if (!link || !client) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <PageHeader title="Link Invalid" subtitle="This agreement link doesn't match an active application." />
        </Card>
      </main>
    );
  }

  // Already past this step (payment received or further) — nothing to do
  // here; send them toward signing in instead of re-showing the agreement.
  if (client.status !== "approved" && client.status !== "payment_pending") {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <PageHeader
            title="Already Completed"
            subtitle="You've already accepted the agreement and completed payment for this step."
          />
          <Link href="/login">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const acceptance = await findAgreementAcceptanceByClientId(client.id);

  return (
    <main className="flex-1 flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        <PageHeader
          title="Review Your Engagement Agreement"
          subtitle={`Hi ${client.fullName} — read through the agreement below, then accept it to continue to payment.`}
        />
        <AgreementText />
        {client.status === "payment_pending" && acceptance ? (
          <Card className="mt-4">
            <p className="text-sm text-brand-slate">
              You accepted this agreement as <strong>{acceptance.acceptedName}</strong> on{" "}
              {new Date(acceptance.acceptedAt).toLocaleDateString()}.
            </p>
            <Link href={`/agreement/${token}/checkout`}>
              <Button className="mt-3">Continue to Payment</Button>
            </Link>
          </Card>
        ) : (
          <AgreementAcceptForm token={token} />
        )}
      </div>
    </main>
  );
}
