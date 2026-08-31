import "server-only";
import PDFDocument from "pdfkit";
import type { ClientRow } from "@/lib/repo/clients";
import { computeBaseline, computeAllocationSummary, computeGoalCompletion } from "@/lib/planCalc";
import { listAllocationLines, findEmergencyAllocation } from "@/lib/repo/allocationLines";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listDebts } from "@/lib/repo/debts";
import { findDebtDecisionByDebtId } from "@/lib/repo/debtDecisions";
import { listGoals } from "@/lib/repo/goals";
import { listActionItems } from "@/lib/repo/actionItems";
import { ACTION_ITEM_STATUS_LABELS } from "@/lib/enums";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Shared by /portal/plan/pdf (the finalized plan, standalone) and
// /portal/export (the full offboarding data export, which embeds this same
// content as one section of a larger document — §16). Keeping this in one
// place means the client's plan reads identically whichever way they
// downloaded it.
export async function writePlanSections(doc: PDFKit.PDFDocument, client: ClientRow) {
  const clientId = client.id;
  const [baseline, summary, flexLines, ef, efAllocation, sinkingFunds, sinkingAllocations, debts, goals, goalAllocations, actions] =
    await Promise.all([
      computeBaseline(clientId),
      computeAllocationSummary(clientId),
      listAllocationLines(clientId, "flex"),
      findEmergencyFund(clientId),
      findEmergencyAllocation(clientId),
      listSinkingFunds(clientId),
      listAllocationLines(clientId, "sinking"),
      listDebts(clientId),
      listGoals(clientId),
      listAllocationLines(clientId, "goal"),
      listActionItems(clientId),
    ]);

  const h1 = (text: string) => doc.moveDown(1).fontSize(18).fillColor("#1f2d22").text(text).moveDown(0.3);
  const h2 = (text: string) => doc.moveDown(0.8).fontSize(13).fillColor("#1f2d22").text(text).moveDown(0.2);
  const line = (text: string) => doc.fontSize(10).fillColor("#3f4a3f").text(text);

  doc.fontSize(22).fillColor("#1f2d22").text("Steadwell — Your Financial Plan", { align: "left" });
  doc.fontSize(10).fillColor("#3f4a3f").text(client.fullName);
  if (client.planFinalizedAt) doc.text(`Finalized ${new Date(client.planFinalizedAt).toLocaleDateString()}`);

  h1("Your Starting Point");
  line(`Monthly Income: ${money(baseline.normalizedMonthlyIncome)}`);
  line(`Bills & Debt Minimums: ${money(baseline.monthlyBills + baseline.debtMinimums)}`);
  line(`Typical Spending: ${money(baseline.historicalSpendingMonthly)}`);
  line(`Available Cash Flow: ${money(baseline.availableMonthlyCashFlow)}`);

  if (client.planGeneralRationale) {
    h1("Your Priorities");
    doc.fontSize(10).fillColor("#3f4a3f").text(client.planGeneralRationale);
  }

  h1("Your Monthly Plan");
  for (const l of flexLines) line(`${l.category}: ${money(l.plannedAmount)}/mo`);
  line(`Emergency Fund: ${money(efAllocation?.plannedAmount ?? 0)}/mo`);
  line(`Debt Acceleration: ${money(summary.debtAccelerationTotal)}/mo`);
  line(`Sinking Funds: ${money(summary.sinkingPlannedTotal)}/mo`);
  line(`Financial Goals: ${money(summary.goalsPlannedTotal)}/mo`);
  doc.moveDown(0.3).fontSize(10).fillColor("#1f2d22").text(`Total Planned: ${money(summary.plannedOutflowTotal)}/mo`);

  if (debts.length > 0) {
    h1("Debt Strategy");
    for (const d of debts) {
      const decision = await findDebtDecisionByDebtId(d.id);
      h2(d.creditor);
      line(`Balance ${money(d.balance)} · ${decision?.strategy ?? "—"} strategy · planned ${money(decision?.plannedPayment ?? 0)}/mo`);
      if (decision?.monthsToPayoff != null) line(`${decision.monthsToPayoff} months to payoff, ${money(decision.totalInterest ?? 0)} total interest`);
      if (decision?.rationale) line(`"${decision.rationale}"`);
    }
  }

  h1("Emergency Fund");
  line(ef ? `${money(ef.currentBalance)} of ${money(ef.target)} target` : "Not tracked");
  line(`Planned: ${money(efAllocation?.plannedAmount ?? 0)}/mo`);

  if (sinkingFunds.length > 0) {
    h1("Sinking Funds");
    for (const f of sinkingFunds) {
      const alloc = sinkingAllocations.find((a) => a.linkedSinkingFundId === f.id);
      line(`${f.name} — ${money(f.currentBalance)} of ${money(f.targetAmount)}, target ${f.targetDate}, planned ${money(alloc?.plannedAmount ?? 0)}/mo`);
    }
  }

  if (goals.length > 0) {
    h1("Financial Goals");
    for (const g of goals) {
      const alloc = goalAllocations.find((a) => a.linkedGoalId === g.id);
      const planned = alloc?.plannedAmount ?? 0;
      const completion = computeGoalCompletion(g.target, g.currentAmount, planned);
      line(
        `${g.name} — ${money(g.currentAmount)} of ${money(g.target)}, planned ${money(planned)}/mo${completion.projectedDate ? `, projected ${completion.projectedDate}` : ""}`
      );
    }
  }

  if (actions.length > 0) {
    h1("Your First 30 Days");
    for (const a of actions) {
      line(`${a.description}${a.dueDate ? ` — by ${a.dueDate}` : ""} — ${ACTION_ITEM_STATUS_LABELS[a.status]}`);
    }
  }
}

// Shared by /portal/plan/pdf (the client's own download) and
// sendEmailDraft's attach-plan-pdf path (src/lib/email.ts, used for the
// Foundation Review completion email) — one place building the actual
// PDFDocument/buffer around writePlanSections above, so both callers
// produce byte-identical output. Caller is responsible for checking
// client.planStatus === "active" first — this doesn't guard that itself.
export async function generatePlanPdfBuffer(client: ClientRow): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  await writePlanSections(doc, client);
  doc.end();
  return done;
}
