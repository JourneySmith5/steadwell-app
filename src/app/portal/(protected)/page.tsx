import Link from "next/link";
import { requireClient } from "@/lib/dal";
import { PageHeader, Card, Button } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/enums";
import { listPaymentsForClient } from "@/lib/repo/payments";
import { listMeetingsForClient } from "@/lib/repo/meetings";
import { isFoundationNonDeliveryRefundEligible, daysSince } from "@/lib/foundationRefund";

export default async function PortalHomePage() {
  const user = await requireClient();
  const status = user.client?.status;

  const [payments, meetings] = user.client
    ? await Promise.all([listPaymentsForClient(user.client.id), listMeetingsForClient(user.client.id)])
    : [[], []];
  const foundationPayment = payments.find((p) => p.type === "foundation" && p.status === "paid");
  const showNonDeliveryNotice =
    !!foundationPayment && isFoundationNonDeliveryRefundEligible(foundationPayment.createdAt, meetings);

  return (
    <div>
      <PageHeader title={`Welcome, ${user.client?.fullName ?? ""}`} />
      {showNonDeliveryNotice && foundationPayment && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <h2 className="font-heading text-lg text-brand-dark mb-2">Foundation Intake Not Yet Delivered</h2>
          <p className="text-sm text-brand-slate">
            It&apos;s been {daysSince(foundationPayment.createdAt)} days since your Financial Foundation
            payment, and your Foundation Intake session hasn&apos;t been completed yet. Per your Coaching
            Agreement (§5.3.1), you may be entitled to a full refund unless the delay was due to your own
            availability.
          </p>
          <div className="mt-3">
            <Link href="/portal/messages">
              <Button type="button" variant="secondary">
                Message Your Coach
              </Button>
            </Link>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-2">Where You Are</h2>
        <p className="text-sm text-brand-slate">
          Current step: <strong>{status ? STATUS_LABELS[status] : "—"}</strong>
        </p>
        <p className="text-xs text-brand-slate/60 mt-2">
          The full preparation checklist and next-action guidance for Home isn&apos;t built
          yet — this is a placeholder showing your pipeline status.
        </p>
        <div className="mt-4">
          <Link href="/portal/foundation">
            <Button type="button">Continue to Financial Foundation →</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
