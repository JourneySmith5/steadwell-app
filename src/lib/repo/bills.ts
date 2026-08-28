import { run, get, all, newId } from "@/lib/db/client";
import { monthlyEquivalent } from "@/lib/calc";

interface BillDbRow {
  id: string;
  client_id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  due_date: string | null;
  fixed_or_variable: string;
  monthly_equivalent: number | null;
}

export interface BillRow {
  id: string;
  clientId: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  dueDate: string | null;
  fixedOrVariable: string;
  monthlyEquivalent: number;
}

function fromRow(row: BillDbRow): BillRow {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    frequency: row.frequency,
    dueDate: row.due_date,
    fixedOrVariable: row.fixed_or_variable,
    monthlyEquivalent: row.monthly_equivalent ?? 0,
  };
}

export async function listBills(clientId: string): Promise<BillRow[]> {
  const rows = await all<BillDbRow>("SELECT * FROM bills WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<BillRow | undefined> {
  const row = await get<BillDbRow>("SELECT * FROM bills WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface BillInput {
  name: string;
  category: string;
  amount: number;
  frequency: string;
  dueDate: string | null;
  fixedOrVariable: string;
}

export async function createBill(clientId: string, input: BillInput): Promise<BillRow> {
  const id = newId();
  const equiv = monthlyEquivalent(input.amount, input.frequency);
  await run(
    `INSERT INTO bills (id, client_id, name, category, amount, frequency, due_date, fixed_or_variable, monthly_equivalent)
     VALUES ($id, $clientId, $name, $category, $amount, $frequency, $dueDate, $fixedOrVariable, $equiv)`,
    {
      $id: id,
      $clientId: clientId,
      $name: input.name,
      $category: input.category,
      $amount: input.amount,
      $frequency: input.frequency,
      $dueDate: input.dueDate,
      $fixedOrVariable: input.fixedOrVariable,
      $equiv: equiv,
    }
  );
  return (await findById(id))!;
}

export async function updateBill(id: string, input: BillInput) {
  const equiv = monthlyEquivalent(input.amount, input.frequency);
  await run(
    `UPDATE bills SET name = $name, category = $category, amount = $amount, frequency = $frequency,
     due_date = $dueDate, fixed_or_variable = $fixedOrVariable, monthly_equivalent = $equiv WHERE id = $id`,
    {
      $id: id,
      $name: input.name,
      $category: input.category,
      $amount: input.amount,
      $frequency: input.frequency,
      $dueDate: input.dueDate,
      $fixedOrVariable: input.fixedOrVariable,
      $equiv: equiv,
    }
  );
}

export async function deleteBill(id: string) {
  await run(`DELETE FROM bills WHERE id = $id`, { $id: id });
}

export async function totalMonthlyBills(clientId: string): Promise<number> {
  const bills = await listBills(clientId);
  return bills.reduce((sum, b) => sum + b.monthlyEquivalent, 0);
}
