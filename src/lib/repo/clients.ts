import { get, all, run, newId, nowIso } from "@/lib/db/client";
import type { ClientStatus, PlanStatus } from "@/lib/enums";

export interface ClientRow {
  id: string;
  status: ClientStatus;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  preferredContact: string;
  userId: string | null;
  coachId: string | null;
  planStatus: PlanStatus;
  planHistoricalSpendingMonthly: number | null;
  planGeneralRationale: string | null;
  planFinalizedAt: string | null;
  planUnbalancedOverrideNote: string | null;
  dateOfBirth: string | null;
  foundationReviewEmailSentAt: string | null;
  litigationHoldActive: boolean;
  litigationHoldNote: string | null;
  createdAt: string;
}

interface ClientDbRow {
  id: string;
  status: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  preferred_contact: string;
  user_id: string | null;
  coach_id: string | null;
  plan_status: string;
  plan_historical_spending_monthly: number | null;
  plan_general_rationale: string | null;
  plan_finalized_at: string | null;
  plan_unbalanced_override_note: string | null;
  date_of_birth: string | null;
  foundation_review_email_sent_at: string | null;
  litigation_hold_active: number;
  litigation_hold_note: string | null;
  created_at: string;
}

function fromRow(row: ClientDbRow): ClientRow {
  return {
    id: row.id,
    status: row.status as ClientStatus,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    preferredContact: row.preferred_contact,
    userId: row.user_id,
    coachId: row.coach_id,
    planStatus: row.plan_status as PlanStatus,
    planHistoricalSpendingMonthly: row.plan_historical_spending_monthly,
    planGeneralRationale: row.plan_general_rationale,
    planFinalizedAt: row.plan_finalized_at,
    planUnbalancedOverrideNote: row.plan_unbalanced_override_note,
    dateOfBirth: row.date_of_birth,
    foundationReviewEmailSentAt: row.foundation_review_email_sent_at,
    litigationHoldActive: !!row.litigation_hold_active,
    litigationHoldNote: row.litigation_hold_note,
    createdAt: row.created_at,
  };
}

export async function createClient(params: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  preferredContact: string;
}): Promise<ClientRow> {
  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO clients (id, status, full_name, email, phone, city, state, preferred_contact, created_at, updated_at)
     VALUES ($id, 'applied', $fullName, $email, $phone, $city, $state, $preferredContact, $now, $now)`,
    {
      $id: id,
      $fullName: params.fullName,
      $email: params.email,
      $phone: params.phone,
      $city: params.city,
      $state: params.state,
      $preferredContact: params.preferredContact,
      $now: now,
    }
  );
  return (await findClientById(id))!;
}

export async function findClientById(id: string): Promise<ClientRow | undefined> {
  const row = await get<ClientDbRow>("SELECT * FROM clients WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

// coachId scopes to one coach's roster (a hired coach only ever sees their
// own clients); omit it for the owner's "everyone" view. Filtering here
// rather than in every caller means a caller that forgets to scope fails
// safe toward "show nothing new" rather than silently leaking every
// client — but callers still have to actually pass the coach's id, so
// this isn't a substitute for the access checks in dal.ts.
export async function listClients(opts: { coachId?: string } = {}): Promise<ClientRow[]> {
  const rows = opts.coachId
    ? await all<ClientDbRow>("SELECT * FROM clients WHERE coach_id = $coachId ORDER BY created_at DESC", {
        $coachId: opts.coachId,
      })
    : await all<ClientDbRow>("SELECT * FROM clients ORDER BY created_at DESC");
  return rows.map(fromRow);
}

// Owner-only reassignment (see the Danger-Zone-adjacent "Coach" control on
// the client detail page) — null unassigns, e.g. if a coach account is
// ever removed. Also what auto-assignment on a new application calls with
// the current default coach's id (src/app/apply/actions.ts).
export async function setClientCoach(clientId: string, coachId: string | null): Promise<void> {
  await run(`UPDATE clients SET coach_id = $coachId, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $coachId: coachId,
    $now: nowIso(),
  });
}

// A tombstone left by hardDeleteClient (§16's 30-day sweep, or the
// immediate "Delete Client Permanently" admin action) — the clients row
// has to survive (the offboardings audit record has a foreign key to it,
// and it's the parent row for anything else still pointing at it), but
// every identifying field on it is overwritten first. Real deletion just
// doesn't mean "the row is gone" here — see hardDeleteClient's own
// comment. UI list views filter these out with this so a completed
// deletion doesn't linger as a visible "[deleted]" row forever; nothing
// about the data itself changes; this is purely a display filter.
export function isDeletedClient(client: Pick<ClientRow, "email">): boolean {
  return client.email.endsWith("@steadwell.invalid");
}

export async function linkClientToUser(clientId: string, userId: string) {
  await run(`UPDATE clients SET user_id = $userId, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $userId: userId,
    $now: nowIso(),
  });
}

export async function findClientByUserId(userId: string): Promise<ClientRow | undefined> {
  const row = await get<ClientDbRow>("SELECT * FROM clients WHERE user_id = $userId", { $userId: userId });
  return row ? fromRow(row) : undefined;
}

export async function setStatus(clientId: string, status: ClientStatus) {
  await run(`UPDATE clients SET status = $status, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $status: status,
    $now: nowIso(),
  });
}

export async function setPlanStatus(clientId: string, planStatus: PlanStatus) {
  await run(`UPDATE clients SET plan_status = $planStatus, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $planStatus: planStatus,
    $now: nowIso(),
  });
}

export async function setPlanFinalizedAt(clientId: string, finalizedAt: string) {
  await run(`UPDATE clients SET plan_finalized_at = $finalizedAt, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $finalizedAt: finalizedAt,
    $now: nowIso(),
  });
}

// null clears it — used on a normal, balanced finalize (Coach didn't need
// an override) so a plan re-finalized after being fixed doesn't keep
// showing a stale override reason from an earlier, unbalanced attempt.
export async function setPlanUnbalancedOverrideNote(clientId: string, note: string | null) {
  await run(`UPDATE clients SET plan_unbalanced_override_note = $note, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $note: note,
    $now: nowIso(),
  });
}

// Client-editable from Foundation Intake → Household. Expects YYYY-MM-DD
// (an <input type="date"> value) or null to clear it.
export async function setDateOfBirth(clientId: string, dateOfBirth: string | null) {
  await run(`UPDATE clients SET date_of_birth = $dateOfBirth, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $dateOfBirth: dateOfBirth,
    $now: nowIso(),
  });
}

// THANKYOU15's 24-hour clock — set the moment Coach actually sends the
// "Foundation Review complete" email (src/lib/email.ts's sendEmailDraft),
// not when the meeting is marked complete or the draft is created.
export async function setFoundationReviewEmailSentAt(clientId: string, sentAt: string) {
  await run(`UPDATE clients SET foundation_review_email_sent_at = $sentAt, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $sentAt: sentAt,
    $now: nowIso(),
  });
}

// Owner-only (Agreement §8.3 / Privacy Policy §4.4) — pauses the §16 30-day
// hard-delete for this client, whenever it would otherwise run, until the
// hold is lifted. See runDeletionSweep / deleteClientImmediately in
// src/lib/offboarding.ts, which both check this before calling
// hardDeleteClient. note is optional context for why the hold exists (a
// case number, a dispute description) — never shown to the client.
export async function setLitigationHold(clientId: string, active: boolean, note: string | null) {
  await run(`UPDATE clients SET litigation_hold_active = $active, litigation_hold_note = $note, updated_at = $now WHERE id = $id`, {
    $id: clientId,
    $active: active ? 1 : 0,
    $note: note,
    $now: nowIso(),
  });
}

export async function updatePlanBaseline(clientId: string, params: { historicalSpendingMonthly: number | null; generalRationale: string | null }) {
  await run(
    `UPDATE clients SET plan_historical_spending_monthly = $historical, plan_general_rationale = $rationale, updated_at = $now WHERE id = $id`,
    {
      $id: clientId,
      $historical: params.historicalSpendingMonthly,
      $rationale: params.generalRationale,
      $now: nowIso(),
    }
  );
}
