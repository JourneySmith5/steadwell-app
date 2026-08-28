import { run, get, newId } from "@/lib/db/client";

interface EmergencyFundDbRow {
  id: string;
  client_id: string;
  current_balance: number;
  target: number;
  target_date: string | null;
  notes: string | null;
}

export interface EmergencyFundRow {
  id: string;
  clientId: string;
  currentBalance: number;
  target: number;
  targetDate: string | null;
  notes: string | null;
}

function fromRow(row: EmergencyFundDbRow): EmergencyFundRow {
  return {
    id: row.id,
    clientId: row.client_id,
    currentBalance: row.current_balance,
    target: row.target,
    targetDate: row.target_date,
    notes: row.notes,
  };
}

// One record per client (§4) — the target the client enters here is a
// starting point Coach can revise during Plan Build (§5), not final.
export async function findEmergencyFund(clientId: string): Promise<EmergencyFundRow | undefined> {
  const row = await get<EmergencyFundDbRow>("SELECT * FROM emergency_funds WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

export async function upsertEmergencyFund(
  clientId: string,
  input: { currentBalance: number; target: number; targetDate: string | null; notes: string | null }
): Promise<EmergencyFundRow> {
  const existing = await findEmergencyFund(clientId);
  if (existing) {
    await run(
      `UPDATE emergency_funds SET current_balance = $currentBalance, target = $target, target_date = $targetDate, notes = $notes WHERE client_id = $clientId`,
      { $clientId: clientId, $currentBalance: input.currentBalance, $target: input.target, $targetDate: input.targetDate, $notes: input.notes }
    );
    return (await findEmergencyFund(clientId))!;
  }
  const id = newId();
  await run(
    `INSERT INTO emergency_funds (id, client_id, current_balance, target, target_date, notes)
     VALUES ($id, $clientId, $currentBalance, $target, $targetDate, $notes)`,
    { $id: id, $clientId: clientId, $currentBalance: input.currentBalance, $target: input.target, $targetDate: input.targetDate, $notes: input.notes }
  );
  return (await findEmergencyFund(clientId))!;
}
