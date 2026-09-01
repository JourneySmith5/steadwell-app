import "server-only";
import { findClientById } from "@/lib/repo/clients";
import {
  listScheduledAccountabilityMeetings,
  setReminder48hSentAt,
  setReminder24hSentAt,
  type MeetingRow,
} from "@/lib/repo/meetings";
import { sendSystemEmail, accountabilityProgressNotesReminderTemplate } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;

// scheduled_at is a plain date (YYYY-MM-DD, no time — Google Calendar's
// Appointment Schedule owns the actual time, this app only records the
// day; see meetings.ts), so "48h before" / "24h before" are read as
// calendar-day offsets (2 days out / 1 day out) rather than exact hour
// boundaries. Both sides normalized to UTC midnight so a same-day cron run
// doesn't drift across the boundary depending on time of day it fires.
function daysUntil(scheduledAt: string, now: Date): number {
  const target = new Date(scheduledAt);
  const targetMidnight = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetMidnight - nowMidnight) / DAY_MS);
}

async function sendReminder(meeting: MeetingRow, whenLabel: string) {
  const client = await findClientById(meeting.clientId);
  if (!client) return false;

  const portalUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/portal/accountability`;
  const { subject, body } = accountabilityProgressNotesReminderTemplate(client.fullName, whenLabel, portalUrl);
  await sendSystemEmail({ clientId: client.id, template: "accountability_meeting_reminder", subject, body });
  return true;
}

// Journey's ask: remind clients ahead of their Accountability meeting to
// jot progress notes in the portal, so the call can build on what they've
// actually done rather than starting from zero. Two independent reminders
// (48h and 24h out) — see the reminder_48h_sent_at/reminder_24h_sent_at
// columns' comment in schema.sql for why they're tracked separately.
// Rides along on the same daily cron as the offboarding/birthday sweeps
// (src/app/api/cron/offboarding-sweep/route.ts) rather than getting its
// own schedule slot.
export async function runMeetingReminderSweep(now: Date = new Date()): Promise<{ sent48h: number; sent24h: number }> {
  let sent48h = 0;
  let sent24h = 0;

  for (const meeting of await listScheduledAccountabilityMeetings()) {
    const days = daysUntil(meeting.scheduledAt!, now);

    if (days === 2 && !meeting.reminder48hSentAt) {
      if (await sendReminder(meeting, "in 2 days")) {
        await setReminder48hSentAt(meeting.id, now.toISOString());
        sent48h++;
      }
    }

    if (days === 1 && !meeting.reminder24hSentAt) {
      if (await sendReminder(meeting, "tomorrow")) {
        await setReminder24hSentAt(meeting.id, now.toISOString());
        sent24h++;
      }
    }
  }

  return { sent48h, sent24h };
}
