import { run, get, all, newId } from "@/lib/db/client";

interface DebtDbRow {
  id: string;
  client_id: string;
  creditor: string;
  type: string;
  balance: number;
  apr: number;
  minimum_payment: number;
  due_date: string | null;
  promo_rate: number | null;
  promo_expires_at: string | null;
}

export interface DebtRow {
  id: string;
  clientId: string;
  creditor: string;
  type: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  dueDate: string | null;
  promoRate: number | null;
  promoExpiresAt: string | null;
}

function fromRow(row: DebtDbRow): DebtRow {
  return {
    id: row.id,
    clientId: row.client_id,
    creditor: row.creditor,
    type: row.type,
    balance: row.balance,
    apr: row.apr,
    minimumPayment: row.minimum_payment,
    dueDate: row.due_date,
    promoRate: row.promo_rate,
    promoExpiresAt: row.promo_expires_at,
  };
}

export async function listDebts(clientId: string): Promise<DebtRow[]> {
  const rows = await all<DebtDbRow>("SELECT * FROM debts WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<DebtRow | undefined> {
  const row = await get<DebtDbRow>("SELECT * FROM debts WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface DebtInput {
  creditor: string;
  type: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  dueDate: string | null;
  promoRate: number | null;
  promoExpiresAt: string | null;
}

export async function createDebt(clientId: string, input: DebtInput): Promise<DebtRow> {
  const id = newId();
  await run(
    `INSERT INTO debts (id, client_id, creditor, type, balance, apr, minimum_payment, due_date, promo_rate, promo_expires_at)
     VALUES ($id, $clientId, $creditor, $type, $balance, $apr, $minimumPayment, $dueDate, $promoRate, $promoExpiresAt)`,
    {
      $id: id,
      $clientId: clientId,
      $creditor: input.creditor,
      $type: input.type,
      $balance: input.balance,
      $apr: input.apr,
      $minimumPayment: input.minimumPayment,
      $dueDate: input.dueDate,
      $promoRate: input.promoRate,
      $promoExpiresAt: input.promoExpiresAt,
    }
  );
  return (await findById(id))!;
}

export async function updateDebt(id: string, input: DebtInput) {
  await run(
    `UPDATE debts SET creditor = $creditor, type = $type, balance = $balance, apr = $apr,
     minimum_payment = $minimumPayment, due_date = $dueDate, promo_rate = $promoRate, promo_expires_at = $promoExpiresAt WHERE id = $id`,
    {
      $id: id,
      $creditor: input.creditor,
      $type: input.type,
      $balance: input.balance,
      $apr: input.apr,
      $minimumPayment: input.minimumPayment,
      $dueDate: input.dueDate,
      $promoRate: input.promoRate,
      $promoExpiresAt: input.promoExpiresAt,
    }
  );
}

export async function deleteDebt(id: string) {
  await run(`DELETE FROM debts WHERE id = $id`, { $id: id });
}

// §4: "system calculates total debt, total minimum payments, and number of
// debts as soon as entries exist — pure summation, not a strategy."
export async function debtSummary(clientId: string): Promise<{ totalBalance: number; totalMinimumPayments: number; count: number }> {
  const debts = await listDebts(clientId);
  return {
    totalBalance: debts.reduce((sum, d) => sum + d.balance, 0),
    totalMinimumPayments: debts.reduce((sum, d) => sum + d.minimumPayment, 0),
    count: debts.length,
  };
}
