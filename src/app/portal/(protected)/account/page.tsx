import { requireClient } from "@/lib/dal";
import { PageHeader, Card, Button } from "@/components/ui";
import { OFFBOARDING_TRIGGER_STATUSES } from "@/lib/enums";
import { findOffboardingByClientId } from "@/lib/repo/offboarding";

// Reads the current time, so it's not a "pure" function — but this is a
// Server Component rendered once per request, not a client component React
// re-renders/memoizes, so it needs to reflect the real time to be correct.
function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default async function AccountPage() {
  const user = await requireClient();
  const isOffboarding = user.client && OFFBOARDING_TRIGGER_STATUSES.includes(user.client.status);
  const offboarding = user.client ? await findOffboardingByClientId(user.client.id) : undefined;
  const daysRemaining = offboarding ? daysUntil(offboarding.deletionDueAt) : null;

  return (
    <div>
      <PageHeader title="Account" />
      <Card className="mb-4">
        <h2 className="font-heading text-lg text-brand-dark mb-2">Security</h2>
        <p className="text-sm text-brand-slate">Email verified: <strong>Yes</strong></p>
        <p className="text-sm text-brand-slate">Two-factor authentication: <strong>Enabled</strong></p>
        <p className="text-xs text-brand-slate/60 mt-2">
          Need to change your password? Sign out and use &quot;Forgot your password?&quot; on the sign-in page.
        </p>
      </Card>
      {isOffboarding && offboarding && (
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-2">Export Your Data</h2>
          <p className="text-sm text-brand-slate">
            Your engagement has ended. You have <strong>{daysRemaining} day{daysRemaining === 1 ? "" : "s"}</strong>{" "}
            left — until {new Date(offboarding.deletionDueAt).toLocaleDateString()} — to export your
            Financial Foundation Plan and records before they&apos;re permanently deleted.
          </p>
          <a href="/portal/export" className="inline-block mt-4">
            <Button type="button">Export My Plan</Button>
          </a>
          {offboarding.exportedAt ? (
            <p className="text-xs text-brand-slate/60 mt-3">
              Exported on {new Date(offboarding.exportedAt).toLocaleDateString()}. You can download it again any
              time before the deletion date above — weekly reminder emails have stopped now that you&apos;ve
              exported.
            </p>
          ) : (
            <p className="text-xs text-brand-slate/60 mt-3">
              Downloads a PDF of your finalized plan (if you had one) plus everything you entered into
              Foundation Intake. You&apos;ll get a reminder email about once a week until you export or the
              deletion date arrives, whichever comes first.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
