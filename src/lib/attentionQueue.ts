import "server-only";
import { listClients, findClientById } from "@/lib/repo/clients";
import { listPendingInvitations } from "@/lib/repo/invitations";
import { listStalePendingPayments } from "@/lib/repo/payments";
import { listReopenedIntakes } from "@/lib/repo/foundationIntake";

// The real Attention Queue (§11) — "surfaces every client needing action ...
// so Coach never has to hunt through every client manually." Replaces the
// Coach Dashboard's old placeholder, which only showed applications waiting
// on Review/Payment. Five categories map directly onto the blueprint's list:
//
//   Foundation Intake complete   -> readyForPlanBuild
//   missing statement            -> not computable — Statements upload is an
//                                    explicit, labeled stub (see README), so
//                                    there's no real completeness data to
//                                    surface here yet. Shown as an honest
//                                    note, not fabricated rows.
//   incomplete account invitation -> incompleteInvitations
//   failed payment                -> stalledPayments
//   correction request pending    -> reopenedIntakes
//
// Two more categories (ready for Review, awaiting Payment) were the old
// placeholder's whole scope — kept here since they're real and useful, just
// folded into the same real queue instead of a separate hard-coded list.

export interface AttentionItem {
  clientId: string;
  fullName: string;
  detail: string;
}

export interface AttentionQueue {
  readyForReview: AttentionItem[];
  awaitingPayment: AttentionItem[];
  readyForPlanBuild: AttentionItem[];
  incompleteInvitations: AttentionItem[];
  stalledPayments: AttentionItem[];
  reopenedIntakes: AttentionItem[];
}

const INVITATION_EXPIRY_WARNING_DAYS = 2;
const STALE_PAYMENT_HOURS = 24;

export async function getAttentionQueue(): Promise<AttentionQueue> {
  const [clients, pendingInvitations, stalePayments, reopened] = await Promise.all([
    listClients(),
    listPendingInvitations(),
    listStalePendingPayments(STALE_PAYMENT_HOURS),
    listReopenedIntakes(),
  ]);
  const byId = new Map(clients.map((c) => [c.id, c]));

  const readyForReview: AttentionItem[] = clients
    .filter((c) => c.status === "in_review")
    .map((c) => ({ clientId: c.id, fullName: c.fullName, detail: "Application awaiting Review decision." }));

  const awaitingPayment: AttentionItem[] = clients
    .filter((c) => c.status === "approved" || c.status === "payment_pending")
    .map((c) => ({
      clientId: c.id,
      fullName: c.fullName,
      detail: c.status === "approved" ? "Waiting on agreement acceptance." : "Agreement accepted — waiting on Foundation payment.",
    }));

  const readyForPlanBuild: AttentionItem[] = clients
    .filter((c) => c.status === "foundation_intake_submitted")
    .map((c) => ({ clientId: c.id, fullName: c.fullName, detail: "Foundation Intake submitted — ready for Plan Build." }));

  const now = Date.now();
  const incompleteInvitations: AttentionItem[] = (
    await Promise.all(
      pendingInvitations.map(async (inv) => {
        const client = await findClientById(inv.clientId);
        if (!client) return null;
        const expiresInMs = new Date(inv.expiresAt).getTime() - now;
        const expired = expiresInMs <= 0;
        const expiringSoon = !expired && expiresInMs <= INVITATION_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
        if (!expired && !expiringSoon) return null;
        return {
          clientId: client.id,
          fullName: client.fullName,
          detail: expired
            ? `Invitation expired ${new Date(inv.expiresAt).toLocaleDateString()} — never used.`
            : `Invitation expires ${new Date(inv.expiresAt).toLocaleDateString()} — not used yet.`,
        };
      })
    )
  ).filter((x): x is AttentionItem => x !== null);

  const stalledPayments: AttentionItem[] = stalePayments
    .map((p) => {
      const client = byId.get(p.clientId);
      if (!client) return null;
      return {
        clientId: client.id,
        fullName: client.fullName,
        detail: `${p.type} payment ($${(p.amountCents / 100).toFixed(2)}) still "${p.status}" since ${new Date(p.createdAt).toLocaleDateString()}.`,
      };
    })
    .filter((x): x is AttentionItem => x !== null);

  const reopenedIntakes: AttentionItem[] = (
    await Promise.all(
      reopened.map(async (intake) => {
        const client = await findClientById(intake.clientId);
        if (!client) return null;
        return {
          clientId: client.id,
          fullName: client.fullName,
          detail: "Client reopened Foundation Intake to make corrections — not yet resubmitted.",
        };
      })
    )
  ).filter((x): x is AttentionItem => x !== null);

  return { readyForReview, awaitingPayment, readyForPlanBuild, incompleteInvitations, stalledPayments, reopenedIntakes };
}

export function attentionQueueCount(queue: AttentionQueue): number {
  return (
    queue.readyForReview.length +
    queue.awaitingPayment.length +
    queue.readyForPlanBuild.length +
    queue.incompleteInvitations.length +
    queue.stalledPayments.length +
    queue.reopenedIntakes.length
  );
}
