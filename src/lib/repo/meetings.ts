import { get, all, run, newId } from "@/lib/db/client";
import type { MeetingType, MeetingStatus } from "@/lib/enums";

interface MeetingDbRow {
  id: string;
  client_id: string;
  type: string;
  scheduled_at: string | null;
  status: string;
  coach_notes: string | null;
  client_action_items: string | null;
  next_meeting_date: string | null;
}

export interface MeetingRow {
  id: string;
  clientId: string;
  type: MeetingType;
  scheduledAt: string | null;
  status: MeetingStatus;
  coachNotes: string | null;
  clientActionItems: string | null;
  nextMeetingDate: string | null;
}

function fromRow(row: MeetingDbRow): MeetingRow {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type as MeetingType,
    scheduledAt: row.scheduled_at,
    status: row.status as MeetingStatus,
    coachNotes: row.coach_notes,
    clientActionItems: row.client_action_items,
    nextMeetingDate: row.next_meeting_date,
  };
}

// Google Calendar's Appointment Schedule handles the actual booking UX
// (§1a) — this table just records what Coach logs about a meeting after
// the fact (or schedules ahead of time), so there's no "created_at" to
// sort by; scheduled date is the meaningful order, most recent/soonest
// first, with not-yet-scheduled entries last.
export async function listMeetingsForClient(clientId: string): Promise<MeetingRow[]> {
  const rows = await all<MeetingDbRow>(
    `SELECT * FROM meetings WHERE client_id = $clientId
     ORDER BY (scheduled_at IS NULL) ASC, scheduled_at DESC`,
    { $clientId: clientId }
  );
  return rows.map(fromRow);
}

export async function findMeetingById(id: string): Promise<MeetingRow | undefined> {
  const row = await get<MeetingDbRow>("SELECT * FROM meetings WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function createMeeting(
  clientId: string,
  params: {
    type: MeetingType;
    scheduledAt: string | null;
    status: MeetingStatus;
    coachNotes: string | null;
    clientActionItems: string | null;
    nextMeetingDate: string | null;
  }
): Promise<MeetingRow> {
  const id = newId();
  await run(
    `INSERT INTO meetings (id, client_id, type, scheduled_at, status, coach_notes, client_action_items, next_meeting_date)
     VALUES ($id, $clientId, $type, $scheduledAt, $status, $coachNotes, $clientActionItems, $nextMeetingDate)`,
    {
      $id: id,
      $clientId: clientId,
      $type: params.type,
      $scheduledAt: params.scheduledAt,
      $status: params.status,
      $coachNotes: params.coachNotes,
      $clientActionItems: params.clientActionItems,
      $nextMeetingDate: params.nextMeetingDate,
    }
  );
  return (await findMeetingById(id))!;
}

export async function updateMeeting(
  id: string,
  params: {
    type: MeetingType;
    scheduledAt: string | null;
    status: MeetingStatus;
    coachNotes: string | null;
    clientActionItems: string | null;
    nextMeetingDate: string | null;
  }
) {
  await run(
    `UPDATE meetings SET type = $type, scheduled_at = $scheduledAt, status = $status,
       coach_notes = $coachNotes, client_action_items = $clientActionItems, next_meeting_date = $nextMeetingDate
     WHERE id = $id`,
    {
      $id: id,
      $type: params.type,
      $scheduledAt: params.scheduledAt,
      $status: params.status,
      $coachNotes: params.coachNotes,
      $clientActionItems: params.clientActionItems,
      $nextMeetingDate: params.nextMeetingDate,
    }
  );
}

// Targeted status flip — used by "Mark Complete & Email Plan" (Coach
// Meetings page) so that action doesn't need to resend every other field
// on the meeting just to change status.
export async function setMeetingStatus(id: string, status: MeetingStatus) {
  await run(`UPDATE meetings SET status = $status WHERE id = $id`, { $id: id, $status: status });
}

export async function deleteMeeting(id: string) {
  await run("DELETE FROM meetings WHERE id = $id", { $id: id });
}
