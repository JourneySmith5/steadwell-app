import { run, get, all, newId } from "@/lib/db/client";

interface HouseholdMemberDbRow {
  id: string;
  client_id: string;
  name: string;
  relationship: string;
  income_included: number;
  expenses_included: number;
}

export interface HouseholdMemberRow {
  id: string;
  clientId: string;
  name: string;
  relationship: string;
  incomeIncluded: boolean;
  expensesIncluded: boolean;
}

function fromRow(row: HouseholdMemberDbRow): HouseholdMemberRow {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    relationship: row.relationship,
    incomeIncluded: !!row.income_included,
    expensesIncluded: !!row.expenses_included,
  };
}

export async function listHouseholdMembers(clientId: string): Promise<HouseholdMemberRow[]> {
  const rows = await all<HouseholdMemberDbRow>("SELECT * FROM household_members WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findHouseholdMemberById(id: string): Promise<HouseholdMemberRow | undefined> {
  const row = await get<HouseholdMemberDbRow>("SELECT * FROM household_members WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function createHouseholdMember(params: {
  clientId: string;
  name: string;
  relationship: string;
  incomeIncluded: boolean;
  expensesIncluded: boolean;
}): Promise<HouseholdMemberRow> {
  const id = newId();
  await run(
    `INSERT INTO household_members (id, client_id, name, relationship, income_included, expenses_included)
     VALUES ($id, $clientId, $name, $relationship, $incomeIncluded, $expensesIncluded)`,
    {
      $id: id,
      $clientId: params.clientId,
      $name: params.name,
      $relationship: params.relationship,
      $incomeIncluded: params.incomeIncluded ? 1 : 0,
      $expensesIncluded: params.expensesIncluded ? 1 : 0,
    }
  );
  return (await findHouseholdMemberById(id))!;
}

export async function updateHouseholdMember(
  id: string,
  params: { name: string; relationship: string; incomeIncluded: boolean; expensesIncluded: boolean }
) {
  await run(
    `UPDATE household_members SET name = $name, relationship = $relationship, income_included = $incomeIncluded, expenses_included = $expensesIncluded WHERE id = $id`,
    {
      $id: id,
      $name: params.name,
      $relationship: params.relationship,
      $incomeIncluded: params.incomeIncluded ? 1 : 0,
      $expensesIncluded: params.expensesIncluded ? 1 : 0,
    }
  );
}

export async function deleteHouseholdMember(id: string) {
  await run(`DELETE FROM household_members WHERE id = $id`, { $id: id });
}
