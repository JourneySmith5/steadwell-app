import { requireClient } from "@/lib/dal";
import { Card } from "@/components/ui";
import { SectionHeader } from "../shared";

// Explicit stub, same situation Stripe was in before Step 4: real file
// upload needs external blob storage credentials (S3/R2/Vercel Blob, etc.)
// that aren't available in this environment. Left as a clearly-labeled stub
// rather than a fake upload — everything else in Foundation Intake is real.
export default async function StatementsPage() {
  await requireClient();
  return (
    <div>
      <SectionHeader label="Statements" locked={false} />
      <Card>
        <p className="text-sm text-brand-slate mb-2">
          Not built yet — bank/account statement upload needs a real file storage backend (e.g. S3, R2, or Vercel
          Blob) that this environment doesn&apos;t have credentials for.
        </p>
        <p className="text-xs text-brand-slate/70">
          Everything else in Foundation Intake is fully functional; this is the one deferred piece, same
          reasoning as the Stripe test-mode fallback before real keys are added — see README.
        </p>
      </Card>
    </div>
  );
}
