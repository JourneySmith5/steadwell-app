import "server-only";
import PDFDocument from "pdfkit";
import type { ClientRow } from "@/lib/repo/clients";
import { writePlanSections } from "@/lib/planPdf";
import { listHouseholdMembers } from "@/lib/repo/householdMembers";
import { listIncomeSources } from "@/lib/repo/incomeSources";
import { listFinancialAccounts } from "@/lib/repo/financialAccounts";
import { listBills } from "@/lib/repo/bills";
import { listDebts } from "@/lib/repo/debts";
import { findEmergencyFund } from "@/lib/repo/emergencyFund";
import { listSavings } from "@/lib/repo/savings";
import { listSinkingFunds } from "@/lib/repo/sinkingFunds";
import { listGoals } from "@/lib/repo/goals";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// §16 "Export My Plan" / §20 "Export action... only" — everything the
// client entered, exported as one PDF. This is what a client downloads
// during their 30-day Offboarding window, and what stops the weekly
// reminder emails once it's been fetched (see markExported in
// src/lib/repo/offboarding.ts). Kept intentionally simple — one document,
// not a multi-file archive — so it works without adding a zip dependency.
export async function buildDataExportPdf(client: ClientRow): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(22).fillColor("#1f2d22").text("Steadwell — Your Data Export");
  doc.fontSize(10).fillColor("#3f4a3f").text(client.fullName);
  doc.text(`Exported ${new Date().toLocaleDateString()}`);
  doc.fontSize(9).fillColor("#3f4a3f").moveDown(0.5).text(
    "Everything you entered into Steadwell — your finalized plan (if one was presented) followed by " +
      "a full copy of your Foundation Intake. This is a snapshot; after your 30-day retention window " +
      "this data is permanently deleted from our system."
  );

  if (client.planStatus === "active") {
    doc.addPage();
    await writePlanSections(doc, client);
  }

  doc.addPage();
  await writeFoundationIntakeSummary(doc, client);

  doc.end();
  return done;
}

async function writeFoundationIntakeSummary(doc: PDFKit.PDFDocument, client: ClientRow) {
  const clientId = client.id;
  const h1 = (text: string) => doc.moveDown(1).fontSize(18).fillColor("#1f2d22").text(text).moveDown(0.3);
  const h2 = (text: string) => doc.moveDown(0.6).fontSize(12).fillColor("#1f2d22").text(text).moveDown(0.1);
  const line = (text: string) => doc.fontSize(10).fillColor("#3f4a3f").text(text);

  doc.fontSize(20).fillColor("#1f2d22").text("Your Foundation Intake");

  const [household, income, accounts, bills, debts, ef, savings, sinkingFunds, goals] = await Promise.all([
    listHouseholdMembers(clientId),
    listIncomeSources(clientId),
    listFinancialAccounts(clientId),
    listBills(clientId),
    listDebts(clientId),
    findEmergencyFund(clientId),
    listSavings(clientId),
    listSinkingFunds(clientId),
    listGoals(clientId),
  ]);

  h1("Household");
  if (household.length === 0) line("None entered.");
  for (const m of household) {
    line(`${m.name} (${m.relationship}) — income included: ${m.incomeIncluded ? "yes" : "no"}, expenses included: ${m.expensesIncluded ? "yes" : "no"}`);
  }

  h1("Income");
  if (income.length === 0) line("None entered.");
  for (const i of income) {
    line(`${i.person} — ${i.sourceName} (${i.type}), ${i.frequency}, take-home ${money(i.takeHome)}, normalized ${money(i.normalizedMonthly)}/mo${i.active ? "" : " (inactive)"}`);
  }

  h1("Accounts");
  if (accounts.length === 0) line("None entered.");
  for (const a of accounts) {
    line(`${a.nickname} (${a.type}) — ${money(a.currentBalance)}${a.purpose ? `, ${a.purpose}` : ""}`);
  }

  h1("Regular Bills");
  if (bills.length === 0) line("None entered.");
  for (const b of bills) {
    line(`${b.name} (${b.category}) — ${money(b.amount)} ${b.frequency}, ${money(b.monthlyEquivalent)}/mo equivalent, ${b.fixedOrVariable}`);
  }

  h1("Debt");
  if (debts.length === 0) line("None entered.");
  for (const d of debts) {
    line(`${d.creditor} (${d.type}) — balance ${money(d.balance)}, ${d.apr}% APR, minimum ${money(d.minimumPayment)}/mo`);
  }

  h1("Emergency Fund");
  line(ef ? `${money(ef.currentBalance)} of ${money(ef.target)} target${ef.targetDate ? `, target date ${ef.targetDate}` : ""}` : "Not entered.");

  h1("Current Savings");
  if (savings.length === 0) line("None entered.");
  for (const s of savings) {
    line(`${s.name} — ${money(s.currentBalance)}${s.purpose ? `, ${s.purpose}` : ""}`);
  }

  h1("Sinking Funds");
  if (sinkingFunds.length === 0) line("None entered.");
  for (const f of sinkingFunds) {
    line(`${f.name} — ${money(f.currentBalance)} of ${money(f.targetAmount)}, target ${f.targetDate}`);
  }

  h1("Financial Goals");
  if (goals.length === 0) line("None entered.");
  for (const g of goals) {
    h2(g.name);
    line(`${money(g.currentAmount)} of ${money(g.target)} · priority: ${g.priority}${g.targetDate ? ` · target date ${g.targetDate}` : ""}`);
    if (g.why) line(`"${g.why}"`);
  }
}
