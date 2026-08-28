import { run, get, all, newId } from "@/lib/db/client";
import { monthlyEquivalent } from "@/lib/calc";

interface IncomeSourceDbRow {
  id: string;
  client_id: string;
  person: string;
  source_name: string;
  type: string;
  take_home: number;
  gross: number | null;
  frequency: string;
  predictability: string;
  variable_typical: number | null;
  variable_low: number | null;
  variable_high: number | null;
  normalized_monthly: number | null;
  active: number;
}

export interface IncomeSourceRow {
  id: string;
  clientId: string;
  person: string;
  sourceName: string;
  type: string;
  takeHome: number;
  gross: number | null;
  frequency: string;
  predictability: string;
  variableTypical: number | null;
  variableLow: number | null;
  variableHigh: number | null;
  normalizedMonthly: number;
  active: boolean;
}

function fromRow(row: IncomeSourceDbRow): IncomeSourceRow {
  return {
    id: row.id,
    clientId: row.client_id,
    person: row.person,
    sourceName: row.source_name,
    type: row.type,
    takeHome: row.take_home,
    gross: row.gross,
    frequency: row.frequency,
    predictability: row.predictability,
    variableTypical: row.variable_typical,
    variableLow: row.variable_low,
    variableHigh: row.variable_high,
    normalizedMonthly: row.normalized_monthly ?? 0,
    active: !!row.active,
  };
}

export async function listIncomeSources(clientId: string): Promise<IncomeSourceRow[]> {
  const rows = await all<IncomeSourceDbRow>("SELECT * FROM income_sources WHERE client_id = $clientId ORDER BY seq", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

async function findIncomeSourceById(id: string): Promise<IncomeSourceRow | undefined> {
  const row = await get<IncomeSourceDbRow>("SELECT * FROM income_sources WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

// §4: "For variable income, also collect typical/low/high amounts. System
// calculates a normalized monthly figure per source." Highly variable or
// irregular income normalizes off the typical amount; otherwise off the
// regular take-home figure.
function computeNormalizedMonthly(params: {
  takeHome: number;
  frequency: string;
  predictability: string;
  variableTypical: number | null;
}): number {
  const isVariable = params.predictability === "Highly variable" || params.predictability === "Irregular or occasional";
  const base = isVariable && params.variableTypical != null ? params.variableTypical : params.takeHome;
  return monthlyEquivalent(base, params.frequency);
}

export interface IncomeSourceInput {
  person: string;
  sourceName: string;
  type: string;
  takeHome: number;
  gross: number | null;
  frequency: string;
  predictability: string;
  variableTypical: number | null;
  variableLow: number | null;
  variableHigh: number | null;
}

export async function createIncomeSource(clientId: string, input: IncomeSourceInput): Promise<IncomeSourceRow> {
  const id = newId();
  const normalizedMonthly = computeNormalizedMonthly(input);
  await run(
    `INSERT INTO income_sources (id, client_id, person, source_name, type, take_home, gross, frequency, predictability, variable_typical, variable_low, variable_high, normalized_monthly, active)
     VALUES ($id, $clientId, $person, $sourceName, $type, $takeHome, $gross, $frequency, $predictability, $variableTypical, $variableLow, $variableHigh, $normalizedMonthly, 1)`,
    {
      $id: id,
      $clientId: clientId,
      $person: input.person,
      $sourceName: input.sourceName,
      $type: input.type,
      $takeHome: input.takeHome,
      $gross: input.gross,
      $frequency: input.frequency,
      $predictability: input.predictability,
      $variableTypical: input.variableTypical,
      $variableLow: input.variableLow,
      $variableHigh: input.variableHigh,
      $normalizedMonthly: normalizedMonthly,
    }
  );
  return (await findIncomeSourceById(id))!;
}

export async function updateIncomeSource(id: string, input: IncomeSourceInput) {
  const normalizedMonthly = computeNormalizedMonthly(input);
  await run(
    `UPDATE income_sources SET person = $person, source_name = $sourceName, type = $type, take_home = $takeHome,
     gross = $gross, frequency = $frequency, predictability = $predictability, variable_typical = $variableTypical,
     variable_low = $variableLow, variable_high = $variableHigh, normalized_monthly = $normalizedMonthly WHERE id = $id`,
    {
      $id: id,
      $person: input.person,
      $sourceName: input.sourceName,
      $type: input.type,
      $takeHome: input.takeHome,
      $gross: input.gross,
      $frequency: input.frequency,
      $predictability: input.predictability,
      $variableTypical: input.variableTypical,
      $variableLow: input.variableLow,
      $variableHigh: input.variableHigh,
      $normalizedMonthly: normalizedMonthly,
    }
  );
}

export async function deleteIncomeSource(id: string) {
  await run(`DELETE FROM income_sources WHERE id = $id`, { $id: id });
}

export async function totalNormalizedMonthlyIncome(clientId: string): Promise<number> {
  const sources = await listIncomeSources(clientId);
  return sources
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.normalizedMonthly, 0);
}
