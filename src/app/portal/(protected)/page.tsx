import Link from "next/link";
import { requireClient } from "@/lib/dal";
import { PageHeader, Card, Button } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/enums";

export default async function PortalHomePage() {
  const user = await requireClient();
  const status = user.client?.status;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.client?.fullName ?? ""}`} />
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
