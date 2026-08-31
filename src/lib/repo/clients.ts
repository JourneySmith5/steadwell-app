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
  planStatus: PlanStatus;
  planHistoricalSpendingMonthly: number | null;
  planGeneralRationale: string | null;
  planFinalizedAt: string | null;
  planUnbalancedOverrideNote: string | null;
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
  plan_status: string;
  plan_historical_spending_monthly: number | null;
  plan_general_rationale: string | null;
  plan_finalized_at: string | null;
  plan_unbalanced_override_note: string | null;
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
    planStatus: row.plan_status as PlanStatus,
    planHistoricalSpendingMonthly: row.plan_historical_spending_monthly,
    planGeneralRationale: row.plan_general_rationale,
    planFinalizedAt: row.plan_finalized_at,
    planUnbalancedOverrideNote: row.plan_unbalanced_override_note,
    createdAt: row.created_at,
  };
}

export async function createClient(params: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  preferredContact: string;
}): Promise<ClientRow> {
  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO clients (id, status, full_name, email, phone, city, state, preferred_contact, created_at, updated_at)
     VALUES ($id, 'applied', $fullName, $email, $phone, $city, 'TX', $preferredContact, $now, $now)`,
    {
      $id: id,
      $fullName: params.fullName,
      $email: params.email,
      $phone: params.phone,
      $city: params.city,
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

export async function listClients(): Promise<ClientRow[]> {
  const rows = await all<ClientDbRow>("SELECT * FROM clients ORDER BY created_at DESC");
  return rows.map(fromRow);
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
