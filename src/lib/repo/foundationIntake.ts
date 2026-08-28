import { run, get, all, newId, nowIso } from "@/lib/db/client";
import type { FoundationIntakeStatus } from "@/lib/enums";

interface FoundationIntakeDbRow {
  id: string;
  client_id: string;
  status: string;
  submitted_at: string | null;
  additional_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoundationIntakeRow {
  id: string;
  clientId: string;
  status: FoundationIntakeStatus;
  submittedAt: string | null;
  additionalInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

function fromRow(row: FoundationIntakeDbRow): FoundationIntakeRow {
  return {
    id: row.id,
    clientId: row.client_id,
    status: row.status as FoundationIntakeStatus,
    submittedAt: row.submitted_at,
    additionalInfo: row.additional_info,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Every client gets exactly one intake record, created lazily the first
// time they open the Foundation Intake section — this is what "progress
// saves automatically" (§4) rests on: there's nothing to explicitly
// "start," the record (and every section's rows) just exists as soon as
// there's anything to save.
export async function getOrCreateFoundationIntake(clientId: string): Promise<FoundationIntakeRow> {
  const existing = await findFoundationIntakeByClientId(clientId);
  if (existing) return existing;
  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO foundation_intakes (id, client_id, status, created_at, updated_at) VALUES ($id, $clientId, 'in_progress', $now, $now)`,
    { $id: id, $clientId: clientId, $now: now }
  );
  return (await findFoundationIntakeByClientId(clientId))!;
}

export async function findFoundationIntakeByClientId(clientId: string): Promise<FoundationIntakeRow | undefined> {
  const row = await get<FoundationIntakeDbRow>("SELECT * FROM foundation_intakes WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

// Shared guard used by every section's actions.ts: once submitted, section
// data is read-only until the client (or Coach, on the client's behalf)
// requests an update. Checked server-side in addition to the UI hiding the
// edit forms, since a locked record must never be mutable via a stale form.
export async function isIntakeLocked(clientId: string): Promise<boolean> {
  const intake = await getOrCreateFoundationIntake(clientId);
  return intake.status === "submitted";
}

// Reopened after a previous submission (submitted_at is set, but status has
// gone back to in_progress via "Request an Update") — the Attention Queue's
// stand-in for §11's "correction request pending," since a client-initiated
// reopen is the one re-review trigger this build actually has.
export async function listReopenedIntakes(): Promise<FoundationIntakeRow[]> {
  const rows = await all<FoundationIntakeDbRow>(
    "SELECT * FROM foundation_intakes WHERE status = 'in_progress' AND submitted_at IS NOT NULL"
  );
  return rows.map(fromRow);
}

export async function updateAdditionalInfo(clientId: string, additionalInfo: string) {
  await run(`UPDATE foundation_intakes SET additional_info = $info, updated_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $info: additionalInfo,
    $now: nowIso(),
  });
}

export async function submitFoundationIntake(clientId: string) {
  await run(
    `UPDATE foundation_intakes SET status = 'submitted', submitted_at = $now, updated_at = $now WHERE client_id = $clientId`,
    { $clientId: clientId, $now: nowIso() }
  );
}

// "Request an Update" (§4) unlocks the whole intake for re-editing. The
// blueprint's ideal is per-section unlock so a correction can't silently
// touch already-reviewed sections — worth building once Plan Build (§5)
// exists and there's a real notion of "which sections Coach has already
// used." Documented here rather than silently simplified.
export async function unlockFoundationIntake(clientId: string) {
  await run(`UPDATE foundation_intakes SET status = 'in_progress', updated_at = $now WHERE client_id = $clientId`, {
    $clientId: clientId,
    $now: nowIso(),
  });
}
