import { run, get, all, newId } from "@/lib/db/client";

interface GoalDbRow {
  id: string;
  client_id: string;
  name: string;
  target: number;
  current_amount: number;
  has_deadline: number;
  target_date: string | null;
  priority: string;
  why: string | null;
}

export interface GoalRow {
  id: string;
  clientId: string;
  name: string;
  target: number;
  currentAmount: number;
  hasDeadline: boolean;
  targetDate: string | null;
  priority: string;
  why: string | null;
}

function fromRow(row: GoalDbRow): GoalRow {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    target: row.target,
    currentAmount: row.current_amount,
    hasDeadline: !!row.has_deadline,
    targetDate: row.target_date,
    priority: row.priority,
    why: row.why,
  };
}

// §4: at least one Financial Goal is required for the application/intake
// (referenced from the public application too — see §3).
export async function listGoals(clientId: string): Promise<GoalRow[]> {
  const rows = await all<GoalDbRow>("SELECT * FROM goals WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<GoalRow | undefined> {
  const row = await get<GoalDbRow>("SELECT * FROM goals WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export interface GoalInput {
  name: string;
  target: number;
  currentAmount: number;
  hasDeadline: boolean;
  targetDate: string | null;
  priority: string;
  why: string | null;
}

export async function createGoal(clientId: string, input: GoalInput): Promise<GoalRow> {
  const id = newId();
  await run(
    `INSERT INTO goals (id, client_id, name, target, current_amount, has_deadline, target_date, priority, why)
     VALUES ($id, $clientId, $name, $target, $currentAmount, $hasDeadline, $targetDate, $priority, $why)`,
    {
      $id: id,
      $clientId: clientId,
      $name: input.name,
      $target: input.target,
      $currentAmount: input.currentAmount,
      $hasDeadline: input.hasDeadline ? 1 : 0,
      $targetDate: input.targetDate,
      $priority: input.priority,
      $why: input.why,
    }
  );
  return (await findById(id))!;
}

export async function updateGoal(id: string, input: GoalInput) {
  await run(
    `UPDATE goals SET name = $name, target = $target, current_amount = $currentAmount, has_deadline = $hasDeadline,
     target_date = $targetDate, priority = $priority, why = $why WHERE id = $id`,
    {
      $id: id,
      $name: input.name,
      $target: input.target,
      $currentAmount: input.currentAmount,
      $hasDeadline: input.hasDeadline ? 1 : 0,
      $targetDate: input.targetDate,
      $priority: input.priority,
      $why: input.why,
    }
  );
}

export async function deleteGoal(id: string) {
  await run(`DELETE FROM goals WHERE id = $id`, { $id: id });
}
