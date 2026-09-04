import { run, get, all, newId, nowIso } from "@/lib/db/client";
import { randomBytes } from "node:crypto";

interface CoachInvitationDbRow {
  id: string;
  email: string;
  full_name: string;
  commission_percent: number | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  resent_count: number;
}

export interface CoachInvitationRow {
  id: string;
  email: string;
  fullName: string;
  commissionPercent: number | null;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  resentCount: number;
}

function fromRow(row: CoachInvitationDbRow): CoachInvitationRow {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    commissionPercent: row.commission_percent,
    token: row.token,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    resentCount: row.resent_count,
  };
}

// Same 7-day window as client invitations (src/lib/repo/invitations.ts).
// commissionPercent is the coach's 1099 cut, set by the owner right here at
// invite time (Journey's ask) — carried onto the users row it becomes on
// accept (see acceptCoachInvitation, src/app/invite/coach/[token]/actions.ts).
export async function createCoachInvitation(email: string, fullName: string, commissionPercent: number): Promise<CoachInvitationRow> {
  const id = newId();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `INSERT INTO coach_invitations (id, email, full_name, commission_percent, token, expires_at, created_at)
     VALUES ($id, $email, $fullName, $commissionPercent, $token, $expiresAt, $now)`,
    {
      $id: id,
      $email: email.toLowerCase(),
      $fullName: fullName,
      $commissionPercent: commissionPercent,
      $token: token,
      $expiresAt: expiresAt,
      $now: nowIso(),
    }
  );
  return (await findCoachInvitationById(id))!;
}

export async function findCoachInvitationById(id: string): Promise<CoachInvitationRow | undefined> {
  const row = await get<CoachInvitationDbRow>("SELECT * FROM coach_invitations WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findCoachInvitationByToken(token: string): Promise<CoachInvitationRow | undefined> {
  const row = await get<CoachInvitationDbRow>("SELECT * FROM coach_invitations WHERE token = $token", { $token: token });
  return row ? fromRow(row) : undefined;
}

export async function findCoachInvitationByEmail(email: string): Promise<CoachInvitationRow | undefined> {
  const row = await get<CoachInvitationDbRow>("SELECT * FROM coach_invitations WHERE email = $email", {
    $email: email.toLowerCase(),
  });
  return row ? fromRow(row) : undefined;
}

// Pending (not-yet-accepted) invites for the Team page roster.
export async function listPendingCoachInvitations(): Promise<CoachInvitationRow[]> {
  const rows = await all<CoachInvitationDbRow>(
    "SELECT * FROM coach_invitations WHERE used_at IS NULL ORDER BY created_at DESC"
  );
  return rows.map(fromRow);
}

export async function markCoachInvitationUsed(id: string) {
  await run(`UPDATE coach_invitations SET used_at = $now WHERE id = $id`, { $id: id, $now: nowIso() });
}

// Resend — new token, new expiry, same row (mirrors resendInvitation in
// src/lib/repo/invitations.ts).
export async function resendCoachInvitation(id: string): Promise<CoachInvitationRow> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `UPDATE coach_invitations SET token = $token, expires_at = $expiresAt, resent_count = resent_count + 1 WHERE id = $id`,
    { $id: id, $token: token, $expiresAt: expiresAt }
  );
  return (await findCoachInvitationById(id))!;
}
