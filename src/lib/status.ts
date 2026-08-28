import "server-only";
import { run, all, newId, nowIso } from "@/lib/db/client";
import { findClientById, setStatus } from "@/lib/repo/clients";
import { createOffboarding } from "@/lib/repo/offboarding";
import type { ClientStatus } from "@/lib/enums";
import { OFFBOARDING_TRIGGER_STATUSES } from "@/lib/enums";

export interface StatusEventRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface StatusEventDbRow {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export async function listStatusEvents(clientId: string): Promise<StatusEventRow[]> {
  const rows = await all<StatusEventDbRow>(
    "SELECT * FROM status_events WHERE client_id = $clientId ORDER BY created_at DESC",
    { $clientId: clientId }
  );
  return rows.map((r) => ({
    id: r.id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    note: r.note,
    createdAt: r.created_at,
  }));
}

// Every pipeline transition is recorded — backs the Coach Admin Dashboard's
// "client timeline" (§11) and gives Data Principles' audit-event objects (§12)
// somewhere to live.
export async function setClientStatus(clientId: string, toStatus: ClientStatus, note?: string) {
  const client = await findClientById(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  await setStatus(clientId, toStatus);
  await run(
    `INSERT INTO status_events (id, client_id, from_status, to_status, note, created_at)
     VALUES ($id, $clientId, $fromStatus, $toStatus, $note, $now)`,
    {
      $id: newId(),
      $clientId: clientId,
      $fromStatus: client.status,
      $toStatus: toStatus,
      $note: note ?? null,
      $now: nowIso(),
    }
  );

  // One status-change event drives the offboarding flow uniformly across
  // Graduated/Canceled/Closed — no separate logic per trigger (§16 build notes).
  if (OFFBOARDING_TRIGGER_STATUSES.includes(toStatus)) {
    await createOffboarding(clientId);
  }
}
