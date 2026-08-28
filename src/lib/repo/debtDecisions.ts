import { run, get, all, newId } from "@/lib/db/client";

interface DebtDecisionDbRow {
  id: string;
  debt_id: string;
  client_id: string;
  priority: number;
  planned_payment: number;
  strategy: string;
  rationale: string | null;
  months_to_payoff: number | null;
  total_interest: number | null;
}

export interface DebtDecisionRow {
  id: string;
  debtId: string;
  clientId: string;
  priority: number;
  plannedPayment: number;
  strategy: string;
  rationale: string | null;
  monthsToPayoff: number | null;
  totalInterest: number | null;
}

function fromRow(row: DebtDecisionDbRow): DebtDecisionRow {
  return {
    id: row.id,
    debtId: row.debt_id,
    clientId: row.client_id,
    priority: row.priority,
    plannedPayment: row.planned_payment,
    strategy: row.strategy,
    rationale: row.rationale,
    monthsToPayoff: row.months_to_payoff,
    totalInterest: row.total_interest,
  };
}

// §7 Stage 4 Debt Strategy — one decision row per debt (Coach-set Priority,
// Planned Payment, Strategy, Rationale), plus the system-calculated payoff
// trajectory (months_to_payoff / total_interest) recomputed whenever the
// planned payment changes.
export async function listDebtDecisions(clientId: string): Promise<DebtDecisionRow[]> {
  const rows = await all<DebtDecisionDbRow>("SELECT * FROM debt_decisions WHERE client_id = $clientId ORDER BY priority ASC", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

export async function findDebtDecisionByDebtId(debtId: string): Promise<DebtDecisionRow | undefined> {
  const row = await get<DebtDecisionDbRow>("SELECT * FROM debt_decisions WHERE debt_id = $debtId", { $debtId: debtId });
  return row ? fromRow(row) : undefined;
}

export interface DebtDecisionInput {
  priority: number;
  plannedPayment: number;
  strategy: string;
  rationale: string | null;
  monthsToPayoff: number | null;
  totalInterest: number | null;
}

export async function upsertDebtDecision(clientId: string, debtId: string, input: DebtDecisionInput): Promise<DebtDecisionRow> {
  const existing = await findDebtDecisionByDebtId(debtId);
  if (existing) {
    await run(
      `UPDATE debt_decisions SET priority = $priority, planned_payment = $plannedPayment, strategy = $strategy,
       rationale = $rationale, months_to_payoff = $monthsToPayoff, total_interest = $totalInterest WHERE id = $id`,
      {
        $id: existing.id,
        $priority: input.priority,
        $plannedPayment: input.plannedPayment,
        $strategy: input.strategy,
        $rationale: input.rationale,
        $monthsToPayoff: input.monthsToPayoff,
        $totalInterest: input.totalInterest,
      }
    );
    return (await findDebtDecisionByDebtId(debtId))!;
  }
  const id = newId();
  await run(
    `INSERT INTO debt_decisions (id, debt_id, client_id, priority, planned_payment, strategy, rationale, months_to_payoff, total_interest)
     VALUES ($id, $debtId, $clientId, $priority, $plannedPayment, $strategy, $rationale, $monthsToPayoff, $totalInterest)`,
    {
      $id: id,
      $debtId: debtId,
      $clientId: clientId,
      $priority: input.priority,
      $plannedPayment: input.plannedPayment,
      $strategy: input.strategy,
      $rationale: input.rationale,
      $monthsToPayoff: input.monthsToPayoff,
      $totalInterest: input.totalInterest,
    }
  );
  return (await findDebtDecisionByDebtId(debtId))!;
}

export async function totalPlannedDebtPayments(clientId: string): Promise<number> {
  const decisions = await listDebtDecisions(clientId);
  return decisions.reduce((sum, d) => sum + d.plannedPayment, 0);
}
