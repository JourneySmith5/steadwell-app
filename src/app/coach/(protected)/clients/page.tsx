import Link from "next/link";
import { listClients } from "@/lib/repo/clients";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import type { ClientStatus } from "@/lib/enums";

export default async function CoachClientsPage() {
  const clients = await listClients();

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${clients.length} total`} />
      <Card>
        {clients.length === 0 && <p className="text-sm text-brand-slate">No clients yet — applications will appear here.</p>}
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
