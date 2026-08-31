import "server-only";
import { findClientById, setPlanStatus, setPlanFinalizedAt, setPlanUnbalancedOverrideNote } from "@/lib/repo/clients";
import { setClientStatus } from "@/lib/status";
import { computeAllocationSummary } from "@/lib/planCalc";
import { nowIso } from "@/lib/db/client";

// Auto-transition on first real touch of the Plan Builder — same pattern as
// Foundation Intake's getOrCreateFoundationIntake: no separate "start"
// button, the record/status just advances the first time Coach opens the
// workspace. Lives here (not in src/lib/repo/clients.ts) because it needs
// setClientStatus from src/lib/status.ts, which itself depends on the repo
// layer — keeping repo/* free of that import avoids a circular dependency.
export async function ensurePlanStarted(clientId: string): Promise<void> {
  const client = await findClientById(clientId);
  if (!client) return;
  if (client.planStatus === "not_started") await setPlanStatus(clientId, "draft");
  if (client.status === "foundation_intake_submitted") {
    await setClientStatus(clientId, "plan_build", "Coach opened Plan Builder");
  }
}

export async function markPlanReviewed(clientId: string): Promise<void> {
  const client = await findClientById(clientId);
  if (!client || client.planStatus !== "draft") return;
  await setPlanStatus(clientId, "reviewed");
}

// §8: the plan normally can't finalize while the Cash-Flow Allocation
// Workspace's balance check is nonzero (§6). Rare cases (an outside
// recommendation — selling an asset, refinancing a loan — covers the rest,
// not something budgeted into the monthly plan) can override that with an
// explicit, non-empty overrideNote — the Finalize page only submits one
// after Coach confirms an "are you sure?" step, so an override always
// leaves a reason on record. Returns false (no-op) rather than throwing if
// the guard fails and no override was given — the UI hides the plain
// Finalize button in that state, this is defense in depth.
export async function finalizePlan(clientId: string, options?: { overrideNote?: string | null }): Promise<boolean> {
  const client = await findClientById(clientId);
  if (!client) return false;
  if (client.planStatus !== "draft" && client.planStatus !== "reviewed") return false;
  const summary = await computeAllocationSummary(clientId);
  const overrideNote = options?.overrideNote?.trim() || null;
  if (summary.difference !== 0 && !overrideNote) return false;
  await setPlanStatus(clientId, "finalized");
  await setPlanFinalizedAt(clientId, nowIso());
  await setPlanUnbalancedOverrideNote(clientId, summary.difference !== 0 ? overrideNote : null);
  return true;
}

// §8: presenting the plan is the moment the client-facing Accountability-or-
// Graduate decision screen (§1, §8) becomes reachable — moves both the plan
// status and the client pipeline status together, replacing what used to be
// the "Mark Plan Finalized & Presented (dev stand-in)" button now that the
// real Plan Builder exists.
export async function presentPlan(clientId: string): Promise<boolean> {
  const client = await findClientById(clientId);
  if (!client || client.planStatus !== "finalized") return false;
  await setPlanStatus(clientId, "active");
  await setClientStatus(clientId, "plan_active", "Plan finalized and presented");
  return true;
}
