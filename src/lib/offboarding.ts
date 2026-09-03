import "server-only";
import { findClientById } from "@/lib/repo/clients";
import {
  listActiveOffboardings,
  incrementRemindersSent,
  markDeleted,
  createOffboarding,
  findOffboardingByClientId,
  type OffboardingRow,
} from "@/lib/repo/offboarding";
import { hardDeleteClient } from "@/lib/repo/deletion";
import { sendSystemEmail, offboardingReminderTemplate, offboardingFinalNoticeTemplate } from "@/lib/email";
import { setClientStatus } from "@/lib/status";
import { OFFBOARDING_TRIGGER_STATUSES } from "@/lib/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string | Date, to: Date): number {
  return Math.floor((to.getTime() - new Date(from).getTime()) / DAY_MS);
}

// §16 "Weekly reminder email: sent every week until the client exports or
// day 30 arrives, whichever comes first. Stops the moment the system sees a
// completed export." Reminders are due at day 7, 14, 21, 28 from the
// triggering status change — remindersSent tracks how many have gone out,
// so "the next one is due" is just remindersSent+1 weeks in. Within roughly
// a week of the deletion date, the heavier-weight final-notice wording is
// used instead of the regular reminder — see offboardingFinalNoticeTemplate.
//
// There's no real cron/scheduler in this dev environment (same honest gap
// as SMTP — see README), so this is called by scripts/offboarding-sweep.ts
// (what a real deployment would point a scheduled job at) and by the
// Coach Dashboard's "Run Sweep Now" button for demoing/manual ops without
// waiting on cron to exist yet.
export async function runReminderSweep(now: Date = new Date()): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  for (const offboarding of await listActiveOffboardings()) {
    if (offboarding.exportedAt) {
      skipped++;
      continue;
    }
    if (new Date(offboarding.deletionDueAt) <= now) {
      // Past due for deletion — the deletion sweep handles this client now,
      // not another reminder.
      skipped++;
      continue;
    }

    const daysSinceTriggered = daysBetween(offboarding.triggeredAt, now);
    const nextReminderDueAtDay = (offboarding.remindersSent + 1) * 7;
    if (daysSinceTriggered < nextReminderDueAtDay) {
      skipped++;
      continue;
    }

    const client = await findClientById(offboarding.clientId);
    if (!client) {
      skipped++;
      continue;
    }

    const daysRemaining = Math.max(0, Math.ceil((new Date(offboarding.deletionDueAt).getTime() - now.getTime()) / DAY_MS));
    const deletionDate = new Date(offboarding.deletionDueAt).toLocaleDateString();
    const exportUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/portal/export`;
    const { subject, body } =
      daysRemaining <= 7
        ? offboardingFinalNoticeTemplate(client.fullName, daysRemaining, deletionDate, exportUrl)
        : offboardingReminderTemplate(client.fullName, daysRemaining, deletionDate, exportUrl);

    await sendSystemEmail({ clientId: client.id, template: "offboarding_reminder", subject, body });
    await incrementRemindersSent(client.id);
    sent++;
  }

  return { sent, skipped };
}

// §16 "Deletion runs as a scheduled job that does not check export status
// — it deletes anything past its 30-day mark regardless of whether the
// client exported. This is what makes it a genuine hard stop." See
// hardDeleteClient (src/lib/repo/deletion.ts) for exactly what's removed.
export async function runDeletionSweep(now: Date = new Date()): Promise<{ deleted: string[] }> {
  const deleted: string[] = [];

  for (const offboarding of await listActiveOffboardings()) {
    if (new Date(offboarding.deletionDueAt) > now) continue;
    await hardDeleteClient(offboarding.clientId);
    await markDeleted(offboarding.clientId);
    deleted.push(offboarding.clientId);
  }

  return { deleted };
}

// An admin escape hatch, not part of the normal §16 flow — for a client
// record that's stuck (a broken test signup, a duplicate, someone who
// never should've been created) rather than one that went through a real
// engagement and earned the usual 30-day export window. Runs the exact
// same hard-delete (`hardDeleteClient`) the real 30-day sweep eventually
// would, just immediately, and reuses the same `offboardings` row as its
// audit tombstone — so this is a strictly faster path to the same end
// state, not a separate/lesser deletion.
//
// A client not yet in a terminal status has no `offboardings` row yet;
// `setClientStatus` creates one as a side effect of the "closed" transition
// (see src/lib/status.ts) exactly like it would for a normal close. A
// client already terminal (closed/canceled/graduated) should already have
// one — `createOffboarding` is called directly only as a defensive
// fallback, since `offboardings.client_id` is UNIQUE and re-triggering
// `setClientStatus` on an already-terminal client would try to insert a
// second row and fail.
export async function deleteClientImmediately(clientId: string, note?: string): Promise<void> {
  const client = await findClientById(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  let offboarding = await findOffboardingByClientId(clientId);
  if (!offboarding) {
    if (OFFBOARDING_TRIGGER_STATUSES.includes(client.status)) {
      offboarding = await createOffboarding(clientId);
    } else {
      await setClientStatus(clientId, "closed", note ?? "Deleted immediately by Coach (admin action)");
      offboarding = await findOffboardingByClientId(clientId);
    }
  }

  await hardDeleteClient(clientId);
  if (offboarding) await markDeleted(clientId);
}

export type { OffboardingRow };
