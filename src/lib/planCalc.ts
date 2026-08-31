import "server-only";
import { findClientById } from "@/lib/repo/clients";
import { totalNormalizedMonthlyIncome, listIncomeSources } from "@/lib/repo/incomeSources";
import { totalMonthlyBills } from "@/lib/repo/bills";
import { listDebts, debtSummary } from "@/lib/repo/debts";
import { listGoals } from "@/lib/repo/goals";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listAllocationLines, findEmergencyAllocation } from "@/lib/repo/allocationLines";
import { totalPlannedDebtPayments, listDebtDecisions } from "@/lib/repo/debtDecisions";

// §5 Stage 1 — Financial Baseline. "Historical statement spending average"
// is Coach-entered (clients.plan_historical_spending_monthly) — Coach's own
// estimate/read of the client's statements, not a computed or AI-derived
// figure.
//
// Two different "how much is there" numbers live here, and they're kept
// deliberately separate:
//   - availableMonthlyCashFlow: the status-quo number — income minus bills,
//     debt minimums, AND historical (i.e. current-habit) spending. This is
//     "what's left over if nothing changes" — useful as a diagnostic on
//     Stage 1 (often negative; that's the point, it shows the household is
//     currently upside down), but it is NOT what Coach plans against.
//   - incomeAvailableToPlan: income minus ONLY the true fixed obligations
//     (bills + debt minimums). This is the real pool the Cash-Flow
//     Allocation Workspace (Stage 3) divides up across flexible spending
//     categories, emergency fund, sinking funds, debt acceleration, and
//     goals. Subtracting historical spending again here would double-count
//     it — the whole point of the plan is to redirect that spending
//     intentionally, not to treat it as already spoken for.
export interface PlanBaseline {
  normalizedMonthlyIncome: number;
  monthlyBills: number;
  debtMinimums: number;
  historicalSpendingMonthly: number;
  incomeAvailableToPlan: number;
  availableMonthlyCashFlow: number;
}

export async function computeBaseline(clientId: string): Promise<PlanBaseline> {
  const [normalizedMonthlyIncome, monthlyBills, debtSum, client] = await Promise.all([
    totalNormalizedMonthlyIncome(clientId),
    totalMonthlyBills(clientId),
    debtSummary(clientId),
    findClientById(clientId),
  ]);
  const debtMinimums = debtSum.totalMinimumPayments;
  const historicalSpendingMonthly = client?.planHistoricalSpendingMonthly ?? 0;
  const incomeAvailableToPlan = normalizedMonthlyIncome - monthlyBills - debtMinimums;
  return {
    normalizedMonthlyIncome,
    monthlyBills,
    debtMinimums,
    historicalSpendingMonthly,
    incomeAvailableToPlan,
    availableMonthlyCashFlow: incomeAvailableToPlan - historicalSpendingMonthly,
  };
}

// §7 / §8 — standard amortization simulation from what Coach entered
// (balance, APR, planned payment). Capped at 100 years so a payment that's
// below the monthly interest charge (debt never pays off) terminates
// instead of looping forever — that case is reported as impossible.
export interface PayoffTrajectory {
  monthsToPayoff: number | null;
  totalInterest: number | null;
  paymentTooLow: boolean;
}

// The floor a Planned Payment needs to clear before payoff math means
// anything — the payment that exactly covers this month's interest charge,
// rounded up a cent so it actually clears it rather than landing exactly on
// the line. This is NOT a recommendation to pay only this much (that never
// touches principal, so the balance never actually shrinks) — it's the
// minimum viable number to show Coach when a planned payment is too low, so
// they know what to raise it to.
export function minimumViablePayment(balance: number, aprPercent: number): number {
  if (balance <= 0) return 0;
  const monthlyInterest = balance * (aprPercent / 100 / 12);
  return Math.ceil(monthlyInterest * 100) / 100;
}

export function computePayoffTrajectory(balance: number, aprPercent: number, monthlyPayment: number): PayoffTrajectory {
  if (balance <= 0) return { monthsToPayoff: 0, totalInterest: 0, paymentTooLow: false };
  if (monthlyPayment <= 0) return { monthsToPayoff: null, totalInterest: null, paymentTooLow: true };

  const monthlyRate = aprPercent / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  const MAX_MONTHS = 1200; // 100 years — a safety cap, not a realistic outcome

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const interest = remaining * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    if (principalPayment <= 0) {
      // Payment doesn't even cover the interest — balance never shrinks.
      return { monthsToPayoff: null, totalInterest: null, paymentTooLow: true };
    }
    totalInterest += interest;
    remaining -= principalPayment;
    if (remaining <= 0) {
      return { monthsToPayoff: month, totalInterest: Math.round(totalInterest * 100) / 100, paymentTooLow: false };
    }
  }
  return { monthsToPayoff: null, totalInterest: null, paymentTooLow: true };
}

// §7 / §8 — goal completion projection from target, current balance, and
// Coach-set planned monthly amount.
export interface GoalCompletion {
  monthsToComplete: number | null;
  projectedDate: string | null; // ISO date, month-level precision
}

export function computeGoalCompletion(target: number, currentAmount: number, plannedMonthly: number): GoalCompletion {
  const remaining = target - currentAmount;
  if (remaining <= 0) return { monthsToComplete: 0, projectedDate: new Date().toISOString().slice(0, 10) };
  if (plannedMonthly <= 0) return { monthsToComplete: null, projectedDate: null };

  const months = Math.ceil(remaining / plannedMonthly);
  const projected = new Date();
  projected.setMonth(projected.getMonth() + months);
  return { monthsToComplete: months, projectedDate: projected.toISOString().slice(0, 10) };
}

// §6 — the Cash-Flow Allocation Workspace's live balance check: Planned
// Income (Stage-1 income minus true fixed obligations — see
// incomeAvailableToPlan above, NOT the status-quo Available Monthly Cash
// Flow) vs Planned Outflow (every category Coach has allocated so far) vs
// Difference. The plan can't finalize while difference !== 0.
export interface AllocationSummary {
  incomeAvailableToPlan: number;
  flexPlannedTotal: number;
  flexHistoricalTotal: number;
  emergencyPlanned: number;
  sinkingPlannedTotal: number;
  debtAccelerationTotal: number;
  goalsPlannedTotal: number;
  plannedOutflowTotal: number;
  difference: number;
}

export async function computeAllocationSummary(clientId: string): Promise<AllocationSummary> {
  const [baseline, flexLines, emergencyAllocation, sinkingLines, debtAccelerationTotal, goalLines] = await Promise.all([
    computeBaseline(clientId),
    listAllocationLines(clientId, "flex"),
    findEmergencyAllocation(clientId),
    listAllocationLines(clientId, "sinking"),
    totalPlannedDebtPayments(clientId),
    listAllocationLines(clientId, "goal"),
  ]);
  const flexPlannedTotal = flexLines.reduce((sum, l) => sum + l.plannedAmount, 0);
  const flexHistoricalTotal = flexLines.reduce((sum, l) => sum + (l.historicalAverage ?? 0), 0);
  const emergencyPlanned = emergencyAllocation?.plannedAmount ?? 0;
  const sinkingPlannedTotal = sinkingLines.reduce((sum, l) => sum + l.plannedAmount, 0);
  const goalsPlannedTotal = goalLines.reduce((sum, l) => sum + l.plannedAmount, 0);
  const plannedOutflowTotal = flexPlannedTotal + emergencyPlanned + sinkingPlannedTotal + debtAccelerationTotal + goalsPlannedTotal;

  return {
    incomeAvailableToPlan: baseline.incomeAvailableToPlan,
    flexPlannedTotal,
    flexHistoricalTotal,
    emergencyPlanned,
    sinkingPlannedTotal,
    debtAccelerationTotal,
    goalsPlannedTotal,
    plannedOutflowTotal,
    difference: Math.round((baseline.incomeAvailableToPlan - plannedOutflowTotal) * 100) / 100,
  };
}

// §7 — Coach-only informational insights. Purely computed facts about the
// data Coach has already entered; never pre-fills a plan value, never has an
// accept/modify/reject workflow (explicitly rejected — see blueprint §5/§7).
export async function generateDebtInsights(clientId: string): Promise<{ text: string; debtId?: string }[]> {
  const [debts, summary] = await Promise.all([listDebts(clientId), debtSummary(clientId)]);
  if (debts.length === 0) return [];
  const insights: { text: string; debtId?: string }[] = [];

  const highestApr = [...debts].sort((a, b) => b.apr - a.apr)[0];
  if (debts.length > 1) {
    insights.push({
      text: `Highest APR in the household: ${highestApr.creditor} at ${highestApr.apr}%.`,
      debtId: highestApr.id,
    });
  }
  insights.push({
    text: `${summary.count} debt${summary.count === 1 ? "" : "s"} totaling $${summary.totalBalance.toFixed(2)}, minimum payments $${summary.totalMinimumPayments.toFixed(2)}/mo.`,
  });
  for (const d of debts) {
    if (d.apr >= 20) {
      insights.push({ text: `${d.creditor} carries a ${d.apr}% APR — a potential priority for extra payment.`, debtId: d.id });
    }
    if (d.promoRate != null && d.promoExpiresAt) {
      insights.push({ text: `${d.creditor}'s promo rate of ${d.promoRate}% expires ${d.promoExpiresAt}.`, debtId: d.id });
    }
  }
  return insights;
}

export async function generateGoalInsights(clientId: string): Promise<{ text: string }[]> {
  const [goals, goalAllocations] = await Promise.all([listGoals(clientId), listAllocationLines(clientId, "goal")]);
  if (goals.length === 0) return [];
  const insights: { text: string }[] = [];
  for (const g of goals) {
    const allocation = goalAllocations.find((l) => l.linkedGoalId === g.id);
    const planned = allocation?.plannedAmount ?? 0;
    if (planned <= 0) {
      insights.push({ text: `"${g.name}" has no planned monthly amount yet — it won't move without one.` });
      continue;
    }
    if (g.hasDeadline && g.targetDate) {
      const completion = computeGoalCompletion(g.target, g.currentAmount, planned);
      if (completion.projectedDate && completion.projectedDate > g.targetDate) {
        insights.push({
          text: `"${g.name}" is projected to finish ${completion.projectedDate}, after its ${g.targetDate} target at the current planned amount.`,
        });
      }
    }
  }
  return insights;
}

// §8 Stage 6 Stress Test — a stateless "what if" recompute: the income
// available to plan (see incomeAvailableToPlan above — NOT the status-quo
// Available Monthly Cash Flow) if the given income sources went to zero,
// compared against the already-planned total outflow (which doesn't
// change — Coach reacts to the resulting shortfall by adjusting
// allocations elsewhere, not the other way around). Nothing here is
// persisted; it's recomputed per request.
export async function computeStressTest(clientId: string, excludedIncomeSourceIds: string[]) {
  const [baseline, incomeSources, summary] = await Promise.all([
    computeBaseline(clientId),
    listIncomeSources(clientId),
    computeAllocationSummary(clientId),
  ]);
  const excludedMonthly = incomeSources
    .filter((s) => excludedIncomeSourceIds.includes(s.id))
    .reduce((sum, s) => sum + s.normalizedMonthly, 0);
  const stressedAvailable = baseline.incomeAvailableToPlan - excludedMonthly;
  return {
    baseline,
    excludedMonthly,
    stressedAvailable,
    plannedOutflowTotal: summary.plannedOutflowTotal,
    shortfall: Math.round((stressedAvailable - summary.plannedOutflowTotal) * 100) / 100,
  };
}

// Re-exported for pages that need the raw data alongside the calculations.
export { listSinkingFunds };
export async function listDebtDecisionsForClient(clientId: string) {
  return listDebtDecisions(clientId);
}
