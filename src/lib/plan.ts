import "server-only";
import { findClientById, setPlanStatus, setPlanFinalizedAt } from "@/lib/repo/clients";
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

// §8: the plan can't finalize while the Cash-Flow Allocation Workspace's
// balance check is nonzero (§6). Returns false (no-op) rather than throwing
// if that guard fails — the UI hides the button in that state, this is
// defense in depth.
export async function finalizePlan(clientId: string): Promise<boolean> {
  const client = await findClientById(clientId);
  if (!client) return false;
  if (client.planStatus !== "draft" && client.planStatus !== "reviewed") return false;
  const summary = await computeAllocationSummary(clientId);
  if (summary.difference !== 0) return false;
  await setPlanStatus(clientId, "finalized");
  await setPlanFinalizedAt(clientId, nowIso());
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
