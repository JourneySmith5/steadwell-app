import { run, get, all, newId } from "@/lib/db/client";

interface FinancialAccountDbRow {
  id: string;
  client_id: string;
  nickname: string;
  type: string;
  current_balance: number;
  purpose: string | null;
}

export interface FinancialAccountRow {
  id: string;
  clientId: string;
  nickname: string;
  type: string;
  currentBalance: number;
  purpose: string | null;
}

function fromRow(row: FinancialAccountDbRow): FinancialAccountRow {
  return {
    id: row.id,
    clientId: row.client_id,
    nickname: row.nickname,
    type: row.type,
    currentBalance: row.current_balance,
    purpose: row.purpose,
  };
}

export async function listFinancialAccounts(clientId: string): Promise<FinancialAccountRow[]> {
  const rows = await all<FinancialAccountDbRow>("SELECT * FROM financial_accounts WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<FinancialAccountRow | undefined> {
  const row = await get<FinancialAccountDbRow>("SELECT * FROM financial_accounts WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface FinancialAccountInput {
  nickname: string;
  type: string;
  currentBalance: number;
  purpose: string | null;
}

export async function createFinancialAccount(clientId: string, input: FinancialAccountInput): Promise<FinancialAccountRow> {
  const id = newId();
  await run(
    `INSERT INTO financial_accounts (id, client_id, nickname, type, current_balance, purpose)
     VALUES ($id, $clientId, $nickname, $type, $currentBalance, $purpose)`,
    { $id: id, $clientId: clientId, $nickname: input.nickname, $type: input.type, $currentBalance: input.currentBalance, $purpose: input.purpose }
  );
  return (await findById(id))!;
}

export async function updateFinancialAccount(id: string, input: FinancialAccountInput) {
  await run(
    `UPDATE financial_accounts SET nickname = $nickname, type = $type, current_balance = $currentBalance, purpose = $purpose WHERE id = $id`,
    { $id: id, $nickname: input.nickname, $type: input.type, $currentBalance: input.currentBalance, $purpose: input.purpose }
  );
}

export async function deleteFinancialAccount(id: string) {
  await run(`DELETE FROM financial_accounts WHERE id = $id`, { $id: id });
}
