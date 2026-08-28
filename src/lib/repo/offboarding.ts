import { run, get, all, newId, nowIso } from "@/lib/db/client";

export interface OffboardingRow {
  id: string;
  clientId: string;
  triggeredAt: string;
  deletionDueAt: string;
  exportedAt: string | null;
  remindersSent: number;
  deletedAt: string | null;
}

interface OffboardingDbRow {
  id: string;
  client_id: string;
  triggered_at: string;
  deletion_due_at: string;
  exported_at: string | null;
  reminders_sent: number;
  deleted_at: string | null;
}

function fromRow(row: OffboardingDbRow): OffboardingRow {
  return {
    id: row.id,
    clientId: row.client_id,
    triggeredAt: row.triggered_at,
    deletionDueAt: row.deletion_due_at,
    exportedAt: row.exported_at,
    remindersSent: row.reminders_sent,
    deletedAt: row.deleted_at,
  };
}

// 30-day hard stop from whatever moment triggers it — Canceled, Closed, or
// Graduated, all uniformly (§16). No separate logic per trigger.
export async function createOffboarding(clientId: string): Promise<OffboardingRow> {
  const id = newId();
  const now = nowIso();
  const deletionDueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `INSERT INTO offboardings (id, client_id, triggered_at, deletion_due_at)
     VALUES ($id, $clientId, $now, $dueAt)`,
    { $id: id, $clientId: clientId, $now: now, $dueAt: deletionDueAt }
  );
  return (await findOffboardingByClientId(clientId))!;
}

export async function findOffboardingByClientId(clientId: string): Promise<OffboardingRow | undefined> {
  const row = await get<OffboardingDbRow>("SELECT * FROM offboardings WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

// Every offboarding record not yet hard-deleted — what the reminder sweep,
// the deletion sweep, and the Coach Admin Dashboard's Offboarding section
// all iterate over (§11, §16).
export async function listActiveOffboardings(): Promise<OffboardingRow[]> {
  const rows = await all<OffboardingDbRow>(
    "SELECT * FROM offboardings WHERE deleted_at IS NULL ORDER BY deletion_due_at ASC"
  );
  return rows.map(fromRow);
}

// Idempotent — the export route calls this on every download, but only the
// first one matters (it's what stops further reminder emails, §16).
export async function markExported(clientId: string) {
  await run(
    `UPDATE offboardings SET exported_at = COALESCE(exported_at, $now) WHERE client_id = $clientId`,
    { $clientId: clientId, $now: nowIso() }
  );
}

export async function incrementRemindersSent(clientId: string) {
  await run(`UPDATE offboardings SET reminders_sent = reminders_sent + 1 WHERE client_id = $clientId`, {
    $clientId: clientId,
  });
}

export async function markDeleted(clientId: string) {
  await run(`UPDATE offboardings SET deleted_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $now: nowIso(),
  });
}
