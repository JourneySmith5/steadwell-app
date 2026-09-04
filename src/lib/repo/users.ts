import { get, all, run, newId, nowIso, withTransaction } from "@/lib/db/client";
import type { UserRole } from "@/lib/enums";

export interface UserRow {
  id: string;
  email: string;
  fullName: string | null;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyExpiresAt: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  passwordResetToken: string | null;
  passwordResetExpiresAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  isDefaultCoach: boolean;
  commissionPercent: number | null;
}

interface UserDbRow {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string;
  commission_percent: number | null;
  role: string;
  email_verified: number;
  email_verify_token: string | null;
  email_verify_expires_at: string | null;
  totp_secret: string | null;
  totp_enabled: number;
  password_reset_token: string | null;
  password_reset_expires_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  is_default_coach: number;
}

function fromRow(row: UserDbRow): UserRow {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    emailVerified: !!row.email_verified,
    emailVerifyToken: row.email_verify_token,
    emailVerifyExpiresAt: row.email_verify_expires_at,
    totpSecret: row.totp_secret,
    totpEnabled: !!row.totp_enabled,
    passwordResetToken: row.password_reset_token,
    passwordResetExpiresAt: row.password_reset_expires_at,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    isDefaultCoach: !!row.is_default_coach,
    commissionPercent: row.commission_percent,
  };
}

// The owner (Boldly Built) — sees every client, every coach-side admin
// action. LIMIT 1 rather than hard-asserting "exactly one" so this stays a
// no-op (not a crash) in the unlikely event it's ever zero.
export async function findOwnerUser(): Promise<UserRow | undefined> {
  return get<UserDbRow>("SELECT * FROM users WHERE role = 'owner' LIMIT 1").then((row) => (row ? fromRow(row) : undefined));
}

// Which coach a new application auto-assigns to (src/app/apply/actions.ts)
// — undefined until the owner sets one (see setDefaultCoach), which is a
// normal state (no crash, no assignment) before any coach has been hired.
export async function findDefaultCoach(): Promise<UserRow | undefined> {
  return get<UserDbRow>("SELECT * FROM users WHERE role = 'coach' AND is_default_coach = 1 LIMIT 1").then((row) =>
    row ? fromRow(row) : undefined
  );
}

// The owner Team page's roster — everyone who can log into the coach side,
// owner first. There's no separate "list all coaches" — the owner is
// always exactly one row and always belongs on this list too.
export async function listCoachSideUsers(): Promise<UserRow[]> {
  const rows = await all<UserDbRow>(
    `SELECT * FROM users WHERE role IN ('owner','coach') ORDER BY (role = 'owner') DESC, created_at ASC`
  );
  return rows.map(fromRow);
}

// At most one default coach at a time — clears any existing one first so
// this can't accidentally leave two rows both flagged (which would make
// findDefaultCoach's LIMIT 1 arbitrarily pick between them). Transactional
// so a crash between the two UPDATEs can't leave zero defaults either.
export async function setDefaultCoach(userId: string): Promise<void> {
  await withTransaction(async () => {
    await run(`UPDATE users SET is_default_coach = 0, updated_at = $now WHERE role = 'coach'`, { $now: nowIso() });
    await run(`UPDATE users SET is_default_coach = 1, updated_at = $now WHERE id = $id AND role = 'coach'`, {
      $id: userId,
      $now: nowIso(),
    });
  });
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const row = await get<UserDbRow>("SELECT * FROM users WHERE email = $email", { $email: email.toLowerCase() });
  return row ? fromRow(row) : undefined;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const row = await get<UserDbRow>("SELECT * FROM users WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findUserByEmailVerifyToken(token: string): Promise<UserRow | undefined> {
  const row = await get<UserDbRow>("SELECT * FROM users WHERE email_verify_token = $t", { $t: token });
  return row ? fromRow(row) : undefined;
}

export async function findUserByPasswordResetToken(token: string): Promise<UserRow | undefined> {
  const row = await get<UserDbRow>("SELECT * FROM users WHERE password_reset_token = $t", { $t: token });
  return row ? fromRow(row) : undefined;
}

export async function createUser(params: {
  email: string;
  fullName?: string | null;
  commissionPercent?: number | null;
  passwordHash: string;
  role: UserRole;
  emailVerifyToken: string;
  emailVerifyExpiresAt: string;
}): Promise<UserRow> {
  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO users (id, email, full_name, commission_percent, password_hash, role, email_verify_token, email_verify_expires_at, created_at, updated_at)
     VALUES ($id, $email, $fullName, $commissionPercent, $passwordHash, $role, $token, $expires, $now, $now)`,
    {
      $id: id,
      $email: params.email.toLowerCase(),
      $fullName: params.fullName ?? null,
      $commissionPercent: params.commissionPercent ?? null,
      $passwordHash: params.passwordHash,
      $role: params.role,
      $token: params.emailVerifyToken,
      $expires: params.emailVerifyExpiresAt,
      $now: now,
    }
  );
  return (await findUserById(id))!;
}

// Team page's inline name edit (owner-only, /coach/team) — lets Journey
// set her own name (no signup flow ever collected one for the owner
// account) and fix a coach's name if needed. New coach invites populate
// this from the invitation automatically (see acceptCoachInvitation in
// src/app/invite/coach/[token]/actions.ts); this is the manual fallback/
// override for everyone else.
export async function setUserFullName(userId: string, fullName: string): Promise<void> {
  await run(`UPDATE users SET full_name = $fullName, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $fullName: fullName,
    $now: nowIso(),
  });
}

// Owner-only, Team page inline "Set %"/"Update %" — a hired coach's 1099
// commission rate, used by /coach/billing to compute what they're owed.
// Set at invite time going forward (required on the Invite Coach form);
// this is the fallback/override for a coach invited before that, or to
// change someone's rate later.
export async function setUserCommissionPercent(userId: string, commissionPercent: number): Promise<void> {
  await run(`UPDATE users SET commission_percent = $commissionPercent, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $commissionPercent: commissionPercent,
    $now: nowIso(),
  });
}

export async function markEmailVerified(userId: string) {
  await run(
    `UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires_at = NULL, updated_at = $now WHERE id = $id`,
    { $id: userId, $now: nowIso() }
  );
}

export async function setTotpSecret(userId: string, secret: string) {
  await run(`UPDATE users SET totp_secret = $secret, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $secret: secret,
    $now: nowIso(),
  });
}

export async function enableTotp(userId: string) {
  await run(`UPDATE users SET totp_enabled = 1, updated_at = $now WHERE id = $id`, { $id: userId, $now: nowIso() });
}

// Forgot-password (§2) — same shape as the invitation/email-verify token
// flows (src/lib/repo/invitations.ts): a random token + expiry stored on the
// row, emailed as a link, single-use. Works for both roles — a coach has no
// `clients` row to hang an invitation off of, so this lives directly on
// `users` (the columns were already in schema.sql, just unused until now).
// Setting a new token silently overwrites/invalidates any previous one, so
// requesting another reset link after losing the first is always safe.
export async function setPasswordResetToken(userId: string, token: string, expiresAt: string) {
  await run(`UPDATE users SET password_reset_token = $token, password_reset_expires_at = $expiresAt, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $token: token,
    $expiresAt: expiresAt,
    $now: nowIso(),
  });
}

// Completing a reset proves control of the account's email, same as a
// correct password does at login — so this also clears the token (single
// use) and any account lockout (§2 §14), giving a genuinely locked-out user
// their own way back in rather than a 15-minute wait plus a guess.
export async function resetPassword(userId: string, passwordHash: string) {
  await run(
    `UPDATE users
     SET password_hash = $passwordHash, password_reset_token = NULL, password_reset_expires_at = NULL,
         failed_login_attempts = 0, locked_until = NULL, updated_at = $now
     WHERE id = $id`,
    { $id: userId, $passwordHash: passwordHash, $now: nowIso() }
  );
}

// Account lockout (§2 Security, build order step 14 "privacy controls") —
// guards against brute-forcing either factor (password or TOTP code) on a
// financial app where both matter. Counted per-account, not per-IP, since
// this dev environment has no shared rate-limit store (no Redis) to key on
// IP across requests — a real production deployment would likely want both.
// A wrong password AND a wrong TOTP code both call recordFailedLogin on the
// same counter/lock, since either one is a live guessing attempt against
// this account; a correct full login (password + TOTP, or password alone
// for an account that hasn't enrolled TOTP yet) clears it.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function isLockedOut(user: Pick<UserRow, "lockedUntil">): boolean {
  return !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
}

// Returns the user's updated lock state so the caller can tell whether this
// specific attempt is what tripped the lock (to show a clear message)
// without a second read.
export async function recordFailedLogin(userId: string): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const user = await findUserById(userId);
  if (!user) return { locked: false, lockedUntil: null };
  const attempts = user.failedLoginAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
    await run(`UPDATE users SET failed_login_attempts = 0, locked_until = $lockedUntil, updated_at = $now WHERE id = $id`, {
      $id: userId,
      $lockedUntil: lockedUntil,
      $now: nowIso(),
    });
    return { locked: true, lockedUntil };
  }
  await run(`UPDATE users SET failed_login_attempts = $attempts, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $attempts: attempts,
    $now: nowIso(),
  });
  return { locked: false, lockedUntil: user.lockedUntil };
}

export async function clearFailedLogins(userId: string) {
  await run(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = $now WHERE id = $id`, {
    $id: userId,
    $now: nowIso(),
  });
}
