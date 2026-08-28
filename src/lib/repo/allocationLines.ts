import { run, get, all, newId } from "@/lib/db/client";
import type { AllocationKind } from "@/lib/enums";

interface AllocationLineDbRow {
  id: string;
  client_id: string;
  category: string;
  kind: string;
  historical_average: number | null;
  planned_amount: number;
  linked_debt_id: string | null;
  linked_goal_id: string | null;
  linked_sinking_fund_id: string | null;
}

export interface AllocationLineRow {
  id: string;
  clientId: string;
  category: string;
  kind: AllocationKind;
  historicalAverage: number | null;
  plannedAmount: number;
  linkedDebtId: string | null;
  linkedGoalId: string | null;
  linkedSinkingFundId: string | null;
}

function fromRow(row: AllocationLineDbRow): AllocationLineRow {
  return {
    id: row.id,
    clientId: row.client_id,
    category: row.category,
    kind: row.kind as AllocationKind,
    historicalAverage: row.historical_average,
    plannedAmount: row.planned_amount,
    linkedDebtId: row.linked_debt_id,
    linkedGoalId: row.linked_goal_id,
    linkedSinkingFundId: row.linked_sinking_fund_id,
  };
}

// §6 Cash-Flow Allocation Workspace. One table backs flex categories,
// Emergency Fund, and Sinking Funds allocations — see the comment on
// ALLOCATION_KINDS in src/lib/enums.ts for why Debt and Goals aren't (fully)
// here.
export async function listAllocationLines(clientId: string, kind?: AllocationKind): Promise<AllocationLineRow[]> {
  if (kind) {
    const rows = await all<AllocationLineDbRow>(
      "SELECT * FROM allocation_lines WHERE client_id = $clientId AND kind = $kind ORDER BY seq",
      { $clientId: clientId, $kind: kind }
    );
    return rows.map(fromRow);
  }
  const rows = await all<AllocationLineDbRow>("SELECT * FROM allocation_lines WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findById(id: string): Promise<AllocationLineRow | undefined> {
  const row = await get<AllocationLineDbRow>("SELECT * FROM allocation_lines WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findAllocationLineByLink(
  clientId: string,
  kind: AllocationKind,
  linkedIdColumn: "linked_goal_id" | "linked_sinking_fund_id",
  linkedId: string
): Promise<AllocationLineRow | undefined> {
  const row = await get<AllocationLineDbRow>(
    `SELECT * FROM allocation_lines WHERE client_id = $clientId AND kind = $kind AND ${linkedIdColumn} = $linkedId`,
    { $clientId: clientId, $kind: kind, $linkedId: linkedId }
  );
  return row ? fromRow(row) : undefined;
}

export async function findEmergencyAllocation(clientId: string): Promise<AllocationLineRow | undefined> {
  const row = await get<AllocationLineDbRow>("SELECT * FROM allocation_lines WHERE client_id = $clientId AND kind = 'emergency'", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

export async function createFlexCategory(
  clientId: string,
  input: { category: string; historicalAverage: number | null; plannedAmount: number }
): Promise<AllocationLineRow> {
  const id = newId();
  await run(
    `INSERT INTO allocation_lines (id, client_id, category, kind, historical_average, planned_amount)
     VALUES ($id, $clientId, $category, 'flex', $historical, $planned)`,
    { $id: id, $clientId: clientId, $category: input.category, $historical: input.historicalAverage, $planned: input.plannedAmount }
  );
  return (await findById(id))!;
}

export async function updateFlexCategory(
  id: string,
  input: { category: string; historicalAverage: number | null; plannedAmount: number }
) {
  await run(
    `UPDATE allocation_lines SET category = $category, historical_average = $historical, planned_amount = $planned WHERE id = $id`,
    { $id: id, $category: input.category, $historical: input.historicalAverage, $planned: input.plannedAmount }
  );
}

export async function deleteAllocationLine(id: string) {
  await run(`DELETE FROM allocation_lines WHERE id = $id`, { $id: id });
}

// Upsert-by-link: Emergency Fund (no link id — one row per client),
// Sinking Funds and Goals (linked to their source row) all get exactly one
// allocation_lines row each, created the first time Coach sets a planned
// amount and updated after that.
export async function upsertEmergencyAllocation(clientId: string, plannedAmount: number): Promise<AllocationLineRow> {
  const existing = await findEmergencyAllocation(clientId);
  if (existing) {
    await run(`UPDATE allocation_lines SET planned_amount = $planned WHERE id = $id`, { $id: existing.id, $planned: plannedAmount });
    return (await findById(existing.id))!;
  }
  const id = newId();
  await run(
    `INSERT INTO allocation_lines (id, client_id, category, kind, planned_amount) VALUES ($id, $clientId, 'Emergency Fund', 'emergency', $planned)`,
    { $id: id, $clientId: clientId, $planned: plannedAmount }
  );
  return (await findById(id))!;
}

export async function upsertSinkingFundAllocation(clientId: string, sinkingFundId: string, category: string, plannedAmount: number): Promise<AllocationLineRow> {
  const existing = await findAllocationLineByLink(clientId, "sinking", "linked_sinking_fund_id", sinkingFundId);
  if (existing) {
    await run(`UPDATE allocation_lines SET category = $category, planned_amount = $planned WHERE id = $id`, {
      $id: existing.id,
      $category: category,
      $planned: plannedAmount,
    });
    return (await findById(existing.id))!;
  }
  const id = newId();
  await run(
    `INSERT INTO allocation_lines (id, client_id, category, kind, planned_amount, linked_sinking_fund_id)
     VALUES ($id, $clientId, $category, 'sinking', $planned, $sinkingFundId)`,
    { $id: id, $clientId: clientId, $category: category, $planned: plannedAmount, $sinkingFundId: sinkingFundId }
  );
  return (await findById(id))!;
}

export async function upsertGoalAllocation(clientId: string, goalId: string, category: string, plannedAmount: number): Promise<AllocationLineRow> {
  const existing = await findAllocationLineByLink(clientId, "goal", "linked_goal_id", goalId);
  if (existing) {
    await run(`UPDATE allocation_lines SET category = $category, planned_amount = $planned WHERE id = $id`, {
      $id: existing.id,
      $category: category,
      $planned: plannedAmount,
    });
    return (await findById(existing.id))!;
  }
  const id = newId();
  await run(
    `INSERT INTO allocation_lines (id, client_id, category, kind, planned_amount, linked_goal_id)
     VALUES ($id, $clientId, $category, 'goal', $planned, $goalId)`,
    { $id: id, $clientId: clientId, $category: category, $planned: plannedAmount, $goalId: goalId }
  );
  return (await findById(id))!;
}
