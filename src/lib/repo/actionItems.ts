import { run, get, all, newId } from "@/lib/db/client";
import type { ActionItemStatus } from "@/lib/enums";

interface ActionItemDbRow {
  id: string;
  client_id: string;
  description: string;
  amount: number | null;
  due_date: string | null;
  status: string;
}

export interface ActionItemRow {
  id: string;
  clientId: string;
  description: string;
  amount: number | null;
  dueDate: string | null;
  status: ActionItemStatus;
}

function fromRow(row: ActionItemDbRow): ActionItemRow {
  return {
    id: row.id,
    clientId: row.client_id,
    description: row.description,
    amount: row.amount,
    dueDate: row.due_date,
    status: row.status as ActionItemStatus,
  };
}

// §8 First 30 Days — simple action items shown on the finalized client plan.
export async function listActionItems(clientId: string): Promise<ActionItemRow[]> {
  const rows = await all<ActionItemDbRow>("SELECT * FROM action_items WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<ActionItemRow | undefined> {
  const row = await get<ActionItemDbRow>("SELECT * FROM action_items WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface ActionItemInput {
  description: string;
  amount: number | null;
  dueDate: string | null;
  status: ActionItemStatus;
}

export async function createActionItem(clientId: string, input: ActionItemInput): Promise<ActionItemRow> {
  const id = newId();
  await run(
    `INSERT INTO action_items (id, client_id, description, amount, due_date, status)
     VALUES ($id, $clientId, $description, $amount, $dueDate, $status)`,
    { $id: id, $clientId: clientId, $description: input.description, $amount: input.amount, $dueDate: input.dueDate, $status: input.status }
  );
  return (await findById(id))!;
}

export async function updateActionItem(id: string, input: ActionItemInput) {
  await run(
    `UPDATE action_items SET description = $description, amount = $amount, due_date = $dueDate, status = $status WHERE id = $id`,
    { $id: id, $description: input.description, $amount: input.amount, $dueDate: input.dueDate, $status: input.status }
  );
}

export async function deleteActionItem(id: string) {
  await run(`DELETE FROM action_items WHERE id = $id`, { $id: id });
}
