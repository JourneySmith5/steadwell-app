import Link from "next/link";
import { listClients } from "@/lib/repo/clients";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import { STATUS_LABELS, type ClientStatus } from "@/lib/enums";

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  // Only trust a status value that's actually a real ClientStatus — anything
  // else in the URL (typo'd, stale link) just falls back to "show everyone"
  // rather than silently filtering to nothing.
  const filterStatus = status && status in STATUS_LABELS ? (status as ClientStatus) : undefined;

  const allClients = await listClients();
  const clients = filterStatus ? allClients.filter((c) => c.status === filterStatus) : allClients;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={filterStatus ? `${clients.length} ${STATUS_LABELS[filterStatus]}` : `${clients.length} total`}
      />
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
              </div>
              <StatusBadge status={c.status as ClientStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
