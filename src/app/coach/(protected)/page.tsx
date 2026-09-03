import Link from "next/link";
import { listClients, findClientById, isDeletedClient } from "@/lib/repo/clients";
import { listActiveOffboardings } from "@/lib/repo/offboarding";
import { getAttentionQueue, attentionQueueCount, type AttentionItem } from "@/lib/attentionQueue";
import { PageHeader, Card, Button } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/enums";
import { runOffboardingSweepNow } from "./actions";
import { requireCoach } from "@/lib/dal";

function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function AttentionSection({ title, items }: { title: string; items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-medium uppercase tracking-wide text-brand-slate/60 mb-1">
        {title} ({items.length})
      </h3>
      <ul className="divide-y divide-brand-pale">
        {items.map((item) => (
          <li key={item.clientId + item.detail} className="py-2 flex items-center justify-between gap-4 text-sm">
            <Link href={`/coach/clients/${item.clientId}`} className="text-brand-dark hover:underline shrink-0">
              {item.fullName}
            </Link>
            <span className="text-brand-slate/70 text-right">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function CoachDashboardPage() {
  const user = await requireCoach();
  const isOwner = user.role === "owner";
  const coachId = isOwner ? undefined : user.id;

  // Offboarding and Backups are owner-only (see requireOwner's comment in
  // dal.ts) — no point fetching that data for a coach who won't see the
  // section at all.
  const [allClients, attention, offboardings] = await Promise.all([
    listClients({ coachId }),
    getAttentionQueue(coachId),
    isOwner ? listActiveOffboardings() : Promise.resolve([]),
  ]);
  // Same reasoning as the Clients list page — a hard-deleted client's
  // tombstone row shouldn't count toward or show up in the pipeline.
  const clients = allClients.filter((c) => !isDeletedClient(c));
  const counts = clients.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const attentionCount = attentionQueueCount(attention);
  const offboardingClients = new Map(
    (await Promise.all(offboardings.map((o) => findClientById(o.clientId)))).map((client, idx) => [offboardings[idx].clientId, client])
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Pipeline overview" />

      {/* Only statuses with at least one client show a tile — with a
          fourteen-status pipeline, showing every status at all times means
          mostly empty "0" tiles cluttering the page. Each tile links to the
          Clients list pre-filtered to that status. */}
      {clients.length === 0 ? (
        <Card className="mb-8">
          <p className="text-sm text-brand-slate">No clients yet — applications will appear here once someone applies.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(STATUS_LABELS)
            .filter(([status]) => (counts[status] ?? 0) > 0)
            .map(([status, label]) => (
              <Link key={status} href={`/coach/clients?status=${status}`}>
                <Card className="text-center hover:bg-brand-pale/30 transition-colors cursor-pointer">
                  <div className="text-2xl font-heading text-brand-dark">{counts[status] ?? 0}</div>
                  <div className="text-xs text-brand-slate/70">{label}</div>
                </Card>
              </Link>
            ))}
        </div>
      )}

      <Card>
        <h2 className="font-heading text-xl text-brand-dark mb-3">Attention Queue</h2>
        <p className="text-xs text-brand-slate/60 mb-3">
          Everything needing action across the whole pipeline: applications awaiting a
          decision, agreements/payments in progress, Foundation Intakes ready for Plan Build,
          account invitations that are expired or expiring soon, payments stuck pending or failed,
          and clients who reopened a submitted intake to make a correction. Missing-statement
          tracking isn&apos;t shown here — Statements upload is an explicit stub (see README).
        </p>
        {attentionCount === 0 && <p className="text-sm text-brand-slate">Nothing needs attention right now.</p>}
        <AttentionSection title="Ready for Review" items={attention.readyForReview} />
        <AttentionSection title="Awaiting Payment" items={attention.awaitingPayment} />
        <AttentionSection title="Ready for Plan Build" items={attention.readyForPlanBuild} />
        <AttentionSection title="Incomplete Account Invitation" items={attention.incompleteInvitations} />
        <AttentionSection title="Stalled / Failed Payment" items={attention.stalledPayments} />
        <AttentionSection title="Correction Requested" items={attention.reopenedIntakes} />
      </Card>

      {isOwner && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl text-brand-dark">Offboarding</h2>
            <form action={runOffboardingSweepNow}>
              <Button type="submit" variant="secondary">
                Run Sweep Now
              </Button>
            </form>
          </div>
          <p className="text-xs text-brand-slate/60 mb-3">
            Export status, reminder emails sent, and scheduled deletion date for every client in
            Canceled/Graduated/Closed. No cron is wired up in this environment — this button runs
            the same reminder + hard-delete sweep a real scheduled job would (see scripts/offboarding-sweep.ts).
          </p>
          {offboardings.length === 0 && <p className="text-sm text-brand-slate">No clients currently offboarding.</p>}
          <ul className="divide-y divide-brand-pale">
            {offboardings.map((o) => {
              const client = offboardingClients.get(o.clientId);
              return (
                <li key={o.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/coach/clients/${o.clientId}`} className="text-brand-dark hover:underline">
                    {client?.fullName ?? o.clientId}
                  </Link>
                  <span className="text-brand-slate text-xs">
                    {o.exportedAt ? `Exported ${new Date(o.exportedAt).toLocaleDateString()}` : "Not exported"} ·{" "}
                    {o.remindersSent} reminder{o.remindersSent === 1 ? "" : "s"} sent · {daysUntil(o.deletionDueAt)} days
                    left
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isOwner && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl text-brand-dark">Backups</h2>
            <a href="/coach/backup">
              <Button type="button" variant="secondary">
                Download Full Backup
              </Button>
            </a>
          </div>
          <p className="text-xs text-brand-slate/60">
            Downloads every table as one JSON file — a real, working manual export, since this dev
            environment has no automated backup schedule (same gap as no real cron for the Offboarding sweeps
            above). It contains everything in the database, including password hashes and TOTP secrets — handle
            the file the way you&apos;d handle the production database itself.
          </p>
        </Card>
      )}
    </div>
  );
}
