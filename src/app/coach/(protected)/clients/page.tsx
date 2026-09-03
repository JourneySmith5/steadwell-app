import Link from "next/link";
import { listClients, isDeletedClient } from "@/lib/repo/clients";
import { listCoachSideUsers } from "@/lib/repo/users";
import { PageHeader, Card, StatusBadge, SuccessText } from "@/components/ui";
import { STATUS_LABELS, type ClientStatus } from "@/lib/enums";
import { requireCoach } from "@/lib/dal";

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string }>;
}) {
  const user = await requireCoach();
  const isOwner = user.role === "owner";
  const { status, deleted } = await searchParams;
  // Only trust a status value that's actually a real ClientStatus — anything
  // else in the URL (typo'd, stale link) just falls back to "show everyone"
  // rather than silently filtering to nothing.
  const filterStatus = status && status in STATUS_LABELS ? (status as ClientStatus) : undefined;

  // A hard-deleted client's row survives as an anonymized tombstone (see
  // isDeletedClient) but shouldn't show up in a list of clients anymore —
  // that's the whole point of deleting one. Coach sees only their own
  // roster; owner sees everyone, with a "Coach: ..." tag per row (once
  // more than one exists) since it's otherwise not obvious whose client
  // is whose.
  const [rawClients, coachUsers] = await Promise.all([
    listClients({ coachId: isOwner ? undefined : user.id }),
    isOwner ? listCoachSideUsers() : Promise.resolve([]),
  ]);
  const coachEmailById = new Map(coachUsers.map((c) => [c.id, c.email]));
  const allClients = rawClients.filter((c) => !isDeletedClient(c));
  const clients = filterStatus ? allClients.filter((c) => c.status === filterStatus) : allClients;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={filterStatus ? `${clients.length} ${STATUS_LABELS[filterStatus]}` : `${clients.length} total`}
      />
      {deleted === "1" && <SuccessText>Client deleted.</SuccessText>}
      {filterStatus && (
        <Link href="/coach/clients" className="text-sm text-brand-slate hover:underline mb-4 inline-block">
          ← Clear filter, show all {allClients.length}
        </Link>
      )}
      <Card>
        {clients.length === 0 && (
          <p className="text-sm text-brand-slate">
            {filterStatus ? `No clients currently at "${STATUS_LABELS[filterStatus]}."` : "No clients yet — applications will appear here."}
          </p>
        )}
        <ul className="divide-y divide-brand-pale">
          {clients.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <Link href={`/coach/clients/${c.id}`} className="text-sm font-medium text-brand-dark hover:underline">
                  {c.fullName}
                </Link>
                <p className="text-xs text-brand-slate/70">{c.email}</p>
                {isOwner && coachUsers.length > 1 && (
                  <p className="text-xs text-brand-slate/50">
                    Coach: {c.coachId ? (coachEmailById.get(c.coachId) ?? "unknown") : "unassigned"}
                  </p>
                )}
              </div>
              <StatusBadge status={c.status as ClientStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
