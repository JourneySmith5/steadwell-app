import { run, get, all, newId } from "@/lib/db/client";

interface SinkingFundDbRow {
  id: string;
  client_id: string;
  name: string;
  target_amount: number;
  current_balance: number;
  target_date: string;
  notes: string | null;
}

export interface SinkingFundRow {
  id: string;
  clientId: string;
  name: string;
  targetAmount: number;
  currentBalance: number;
  targetDate: string;
  notes: string | null;
}

function fromRow(row: SinkingFundDbRow): SinkingFundRow {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    targetAmount: row.target_amount,
    currentBalance: row.current_balance,
    targetDate: row.target_date,
    notes: row.notes,
  };
}

export async function listSinkingFunds(clientId: string): Promise<SinkingFundRow[]> {
  const rows = await all<SinkingFundDbRow>("SELECT * FROM sinking_funds WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<SinkingFundRow | undefined> {
  const row = await get<SinkingFundDbRow>("SELECT * FROM sinking_funds WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface SinkingFundInput {
  name: string;
  targetAmount: number;
  currentBalance: number;
  targetDate: string;
  notes: string | null;
}

export async function createSinkingFund(clientId: string, input: SinkingFundInput): Promise<SinkingFundRow> {
  const id = newId();
  await run(
    `INSERT INTO sinking_funds (id, client_id, name, target_amount, current_balance, target_date, notes)
     VALUES ($id, $clientId, $name, $targetAmount, $currentBalance, $targetDate, $notes)`,
    { $id: id, $clientId: clientId, $name: input.name, $targetAmount: input.targetAmount, $currentBalance: input.currentBalance, $targetDate: input.targetDate, $notes: input.notes }
  );
  return (await findById(id))!;
}

export async function updateSinkingFund(id: string, input: SinkingFundInput) {
  await run(
    `UPDATE sinking_funds SET name = $name, target_amount = $targetAmount, current_balance = $currentBalance, target_date = $targetDate, notes = $notes WHERE id = $id`,
    { $id: id, $name: input.name, $targetAmount: input.targetAmount, $currentBalance: input.currentBalance, $targetDate: input.targetDate, $notes: input.notes }
  );
}

export async function deleteSinkingFund(id: string) {
  await run(`DELETE FROM sinking_funds WHERE id = $id`, { $id: id });
}
