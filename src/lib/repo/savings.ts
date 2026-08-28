import { run, get, all, newId } from "@/lib/db/client";

interface SavingsDbRow {
  id: string;
  client_id: string;
  name: string;
  current_balance: number;
  purpose: string | null;
}

export interface SavingsRow {
  id: string;
  clientId: string;
  name: string;
  currentBalance: number;
  purpose: string | null;
}

function fromRow(row: SavingsDbRow): SavingsRow {
  return { id: row.id, clientId: row.client_id, name: row.name, currentBalance: row.current_balance, purpose: row.purpose };
}

export async function listSavings(clientId: string): Promise<SavingsRow[]> {
  const rows = await all<SavingsDbRow>("SELECT * FROM savings WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<SavingsRow | undefined> {
  const row = await get<SavingsDbRow>("SELECT * FROM savings WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface SavingsInput {
  name: string;
  currentBalance: number;
  purpose: string | null;
}

export async function createSavings(clientId: string, input: SavingsInput): Promise<SavingsRow> {
  const id = newId();
  await run(`INSERT INTO savings (id, client_id, name, current_balance, purpose) VALUES ($id, $clientId, $name, $currentBalance, $purpose)`, {
    $id: id,
    $clientId: clientId,
    $name: input.name,
    $currentBalance: input.currentBalance,
    $purpose: input.purpose,
  });
  return (await findById(id))!;
}

export async function updateSavings(id: string, input: SavingsInput) {
  await run(`UPDATE savings SET name = $name, current_balance = $currentBalance, purpose = $purpose WHERE id = $id`, {
    $id: id,
    $name: input.name,
    $currentBalance: input.currentBalance,
    $purpose: input.purpose,
  });
}

export async function deleteSavings(id: string) {
  await run(`DELETE FROM savings WHERE id = $id`, { $id: id });
}
