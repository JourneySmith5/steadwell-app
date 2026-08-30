import { notFound } from "next/navigation";
import { findClientById } from "@/lib/repo/clients";
import { findApplicationByClientId } from "@/lib/repo/applications";
import { findInvitationByClientId } from "@/lib/repo/invitations";
import { findCheckoutLinkByClientId } from "@/lib/repo/checkoutLinks";
import { listPaymentsForClient } from "@/lib/repo/payments";
import { listEmailsForClient } from "@/lib/repo/emails";
import { listStatusEvents } from "@/lib/status";
import { listMeetingsForClient } from "@/lib/repo/meetings";
import { findSubscriptionByClientId } from "@/lib/repo/subscriptions";
import { findOffboardingByClientId } from "@/lib/repo/offboarding";
import { listStatements } from "@/lib/repo/statements";
import { formatStatementMonth } from "@/lib/statementMonths";
import { PageHeader, Card, StatusBadge, Button } from "@/components/ui";
import {
  PLAN_STATUS_LABELS,
  MEETING_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  ACCOUNTABILITY_TIERS,
  OFFBOARDING_TRIGGER_STATUSES,
  type ClientStatus,
} from "@/lib/enums";
import { approveClient, declineClient, resendAgreementEmail, resendInvitationEmail } from "./actions";
import Link from "next/link";

// Once Foundation Intake is submitted, Coach always has a way back into the
// Plan Builder — including after the plan is active, in case something
// needs revisiting (the client-facing plan itself stays a fixed snapshot —
// see §8 "the plan is intentionally not live" — but Coach can still open
// the workspace that produced it).
const PLAN_BUILDER_VISIBLE_STATUSES: ClientStatus[] = [
  "foundation_intake_submitted",
  "plan_build",
  "plan_active",
  "accountability_active",
  "graduated",
  "canceled",
  "closed",
];

export default async function ClientDetailPage(props: PageProps<"/coach/clients/[id]">) {
  const { id } = await props.params;
  const client = await findClientById(id);
  if (!client) notFound();

  const [application, invitation, checkoutLink, payments, emails, timeline, meetings, subscription, offboarding, statements] =
    await Promise.all([
      findApplicationByClientId(id),
      findInvitationByClientId(id),
      findCheckoutLinkByClientId(id),
      listPaymentsForClient(id),
      listEmailsForClient(id),
      listStatusEvents(id),
      client.userId ? listMeetingsForClient(id) : Promise.resolve([]),
      client.userId ? findSubscriptionByClientId(id) : Promise.resolve(undefined),
      OFFBOARDING_TRIGGER_STATUSES.includes(client.status) ? findOffboardingByClientId(id) : Promise.resolve(undefined),
      client.userId ? listStatements(id) : Promise.resolve([]),
    ]);
  const subscriptionTier = subscription ? ACCOUNTABILITY_TIERS.find((t) => t.id === subscription.tier) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title={client.fullName} subtitle={client.email} />
        <StatusBadge status={client.status} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {client.status === "in_review" && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Review Application</h2>
              <form action={approveClient.bind(null, client.id)} className="inline-block mr-2">
                <Button type="submit">Approve</Button>
              </form>
              <form action={declineClient.bind(null, client.id)} className="inline-block">
                <Button type="submit" variant="danger">
                  Decline
                </Button>
              </form>
              <p className="text-xs text-brand-slate/60 mt-2">
                Either action opens an editable email draft — nothing sends automatically.
              </p>
            </Card>
          )}

          {(client.status === "approved" || client.status === "payment_pending") && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Agreement & Payment</h2>
              {client.status === "approved" ? (
                <p className="text-sm text-brand-slate mb-3">
                  Waiting on the client to open the agreement link and accept the engagement agreement.
                </p>
              ) : (
                <p className="text-sm text-brand-slate mb-3">
                  Client accepted the engagement agreement — waiting on the $399 Financial Foundation
                  payment.
                </p>
              )}
              {payments.length > 0 && (
                <ul className="text-xs text-brand-slate/70 mb-3 space-y-1">
                  {payments.map((p) => (
                    <li key={p.id}>
                      ${(p.amountCents / 100).toFixed(2)} — {p.status}
                      {p.discountCode && ` (code: ${p.discountCode})`} —{" "}
                      {new Date(p.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
              {checkoutLink && (
                <form action={resendAgreementEmail.bind(null, client.id)}>
                  <Button type="submit" variant="secondary">
                    Resend Agreement & Payment Email
                  </Button>
                </form>
              )}
            </Card>
          )}

          {PLAN_BUILDER_VISIBLE_STATUSES.includes(client.status) && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Plan Build</h2>
              <p className="text-sm text-brand-slate mb-3">
                Plan status: <span className="font-medium text-brand-dark">{PLAN_STATUS_LABELS[client.planStatus]}</span>
              </p>
              <Link href={`/coach/clients/${client.id}/plan`}>
                <Button variant="secondary">
                  {client.planStatus === "not_started" ? "Open Plan Builder" : "Continue Plan Builder"}
                </Button>
              </Link>
            </Card>
          )}

          {client.userId && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Meetings</h2>
              <p className="text-sm text-brand-slate mb-3">
                {meetings.length === 0
                  ? "No meetings logged yet."
                  : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"} logged — most recent: ${meetings[0].type} (${MEETING_STATUS_LABELS[meetings[0].status]}).`}
              </p>
              <Link href={`/coach/clients/${client.id}/meetings`}>
                <Button variant="secondary">Manage Meetings</Button>
              </Link>
              <p className="text-xs text-brand-slate/60 mt-2">
                Google Calendar&apos;s Appointment Schedule handles actual booking — this just tracks
                status, notes, and client action items.
              </p>
            </Card>
          )}

          {client.userId && subscription && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Accountability & Billing</h2>
              <p className="text-sm text-brand-slate">
                <span className="font-medium text-brand-dark">{subscriptionTier?.label ?? subscription.tier}</span>
                {" — "}
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                {!subscription.stripeSubscriptionId && " (test mode)"}
              </p>
              <p className="text-xs text-brand-slate/60 mt-2">
                Self-service — the client chooses, changes, and cancels their own tier from the portal; no
                Coach approval step exists by design.
              </p>
            </Card>
          )}

          {offboarding && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Offboarding</h2>
              <p className="text-sm text-brand-slate">
                {offboarding.exportedAt
                  ? `Exported on ${new Date(offboarding.exportedAt).toLocaleDateString()}.`
                  : "Not exported yet."}
              </p>
              <p className="text-sm text-brand-slate mt-1">
                {offboarding.remindersSent} reminder{offboarding.remindersSent === 1 ? "" : "s"} sent · deletion
                due {new Date(offboarding.deletionDueAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-brand-slate/60 mt-2">
                30 days from when the engagement ended. Weekly reminder emails send automatically until
                the client exports or the deletion date arrives — see Dashboard for the sweep control.
              </p>
            </Card>
          )}

          {invitation && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Account Setup</h2>
              <p className="text-sm text-brand-slate">
                Invitation {invitation.usedAt ? "used" : "pending"} · expires{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()} · resent {invitation.resentCount}x
              </p>
              {!invitation.usedAt && (
                <form action={resendInvitationEmail.bind(null, client.id)} className="mt-3">
                  <Button type="submit" variant="secondary">
                    Resend Account Email
                  </Button>
                </form>
              )}
            </Card>
          )}

          {application && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Application</h2>
              <dl className="text-sm space-y-2">
                <Row label="Household" value={application.household_context} />
                <Row label="Current situation" value={application.current_situation} />
                <Row label="Income structure" value={application.household_income_structure} />
                <Row label="Challenge areas" value={application.challengeAreas.join(", ")} />
                <Row label="Goals (12mo)" value={application.goalsNext12Months.join("; ")} />
                <Row label="Success looks like" value={application.success_definition} />
                <Row label="Current tools" value={application.current_tools} />
                <Row label="Existing professionals" value={application.existing_professionals} />
                {application.why_now && <Row label="Why now" value={application.why_now} />}
                {application.anything_else && <Row label="Anything else" value={application.anything_else} />}
              </dl>
            </Card>
          )}

          <Card>
            <h2 className="font-heading text-lg text-brand-dark mb-3">Email Activity</h2>
            {emails.length === 0 && <p className="text-sm text-brand-slate">No emails yet.</p>}
            <ul className="divide-y divide-brand-pale">
              {emails.map((e) => (
                <li key={e.id} className="py-2 text-sm flex items-center justify-between">
                  <Link href={`/coach/clients/${client.id}/email/${e.id}`} className="text-brand-dark hover:underline">
                    {e.subject}
                  </Link>
                  <span className={e.status === "sent" ? "text-brand-sage" : "text-brand-accent"}>{e.status}</span>
                </li>
              ))}
            </ul>
          </Card>

          {client.userId && (
            <Card>
              <h2 className="font-heading text-lg text-brand-dark mb-3">Statements</h2>
              {statements.length === 0 && (
                <p className="text-sm text-brand-slate">Client hasn&apos;t uploaded any statements yet.</p>
              )}
              <ul className="divide-y divide-brand-pale">
                {statements.map((s) => (
                  <li key={s.id} className="py-2 text-sm flex items-center justify-between">
                    <span className="text-brand-dark">
                      {s.accountNickname}
                      {formatStatementMonth(s.month) ? ` — ${formatStatementMonth(s.month)}` : ""}
                    </span>
                    <a href={`/api/statements/${s.id}/download`} className="text-brand-dark underline hover:no-underline">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Timeline</h2>
          <ul className="space-y-2 text-xs text-brand-slate">
            {timeline.map((t) => (
              <li key={t.id}>
                <span className="text-brand-dark font-medium">{t.toStatus}</span>
                <span className="text-brand-slate/60"> — {new Date(t.createdAt).toLocaleString()}</span>
                {t.note && <div className="text-brand-slate/70">{t.note}</div>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-brand-slate/60 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-brand-slate">{value}</dd>
    </div>
  );
}
