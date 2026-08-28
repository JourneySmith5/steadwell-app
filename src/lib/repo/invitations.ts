import { run, get, all, newId, nowIso } from "@/lib/db/client";
import { randomBytes } from "node:crypto";

interface InvitationDbRow {
  id: string;
  client_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  resent_count: number;
}

export interface InvitationRow {
  id: string;
  clientId: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  resentCount: number;
}

function fromRow(row: InvitationDbRow): InvitationRow {
  return {
    id: row.id,
    clientId: row.client_id,
    token: row.token,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    resentCount: row.resent_count,
  };
}

// Invitation links are time-limited (§2) — 7 days.
export async function createInvitation(clientId: string): Promise<InvitationRow> {
  const id = newId();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `INSERT INTO invitations (id, client_id, token, expires_at, created_at) VALUES ($id, $clientId, $token, $expiresAt, $now)`,
    { $id: id, $clientId: clientId, $token: token, $expiresAt: expiresAt, $now: nowIso() }
  );
  return (await findInvitationById(id))!;
}

export async function findInvitationById(id: string): Promise<InvitationRow | undefined> {
  const row = await get<InvitationDbRow>("SELECT * FROM invitations WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findInvitationByToken(token: string): Promise<InvitationRow | undefined> {
  const row = await get<InvitationDbRow>("SELECT * FROM invitations WHERE token = $token", { $token: token });
  return row ? fromRow(row) : undefined;
}

export async function findInvitationByClientId(clientId: string): Promise<InvitationRow | undefined> {
  const row = await get<InvitationDbRow>("SELECT * FROM invitations WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

// Every invitation not yet accepted — the Attention Queue (§11) uses this to
// surface incomplete account setups (expiring soon or already expired).
export async function listPendingInvitations(): Promise<InvitationRow[]> {
  const rows = await all<InvitationDbRow>("SELECT * FROM invitations WHERE used_at IS NULL ORDER BY expires_at ASC");
  return rows.map(fromRow);
}

export async function markInvitationUsed(id: string) {
  await run(`UPDATE invitations SET used_at = $now WHERE id = $id`, { $id: id, $now: nowIso() });
}

// One-click "Resend Account Email" (§11) — new token, new expiry, tracks count.
export async function resendInvitation(clientId: string): Promise<InvitationRow> {
  const existing = await findInvitationByClientId(clientId);
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (!existing) return createInvitation(clientId);
  await run(`UPDATE invitations SET token = $token, expires_at = $expiresAt, resent_count = resent_count + 1 WHERE id = $id`, {
    $id: existing.id,
    $token: token,
    $expiresAt: expiresAt,
  });
  return (await findInvitationById(existing.id))!;
}
