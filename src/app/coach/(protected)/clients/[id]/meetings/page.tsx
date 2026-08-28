import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/dal";
import { findClientById } from "@/lib/repo/clients";
import { listMeetingsForClient } from "@/lib/repo/meetings";
import { Card, PageHeader, Field, TextInput, TextArea, Select, Button } from "@/components/ui";
import { MEETING_TYPES, MEETING_STATUSES, MEETING_STATUS_LABELS } from "@/lib/enums";
import { addMeeting, saveMeeting, removeMeeting } from "./actions";

export default async function MeetingsPage(props: PageProps<"/coach/clients/[id]/meetings">) {
  await requireCoach();
  const { id: clientId } = await props.params;
  const client = await findClientById(clientId);
  if (!client) notFound();

  const meetings = await listMeetingsForClient(clientId);

  return (
    <div>
      <Link href={`/coach/clients/${clientId}`} className="text-sm text-brand-slate hover:text-brand-dark">
        ← {client.fullName}
      </Link>
      <PageHeader
        title="Meetings"
        subtitle="Google Calendar's Appointment Schedule handles actual booking — this records status, notes, and action items."
      />

      <Card className="mb-6">
        <h2 className="font-heading text-lg text-brand-dark mb-3">Log a Meeting</h2>
        <form action={addMeeting.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type">
            <Select name="type" defaultValue={MEETING_TYPES[0]}>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Scheduled date" hint="Optional.">
            <TextInput type="date" name="scheduledAt" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="scheduled">
              {MEETING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MEETING_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Next meeting date" hint="Optional.">
            <TextInput type="date" name="nextMeetingDate" />
          </Field>
          <Field label="Coach notes" hint="Private — never shown to the client.">
            <TextArea name="coachNotes" rows={3} />
          </Field>
          <Field label="Client action items" hint="Shown to the client on their Accountability page.">
            <TextArea name="clientActionItems" rows={3} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">Log Meeting</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Meeting History</h2>
        {meetings.length === 0 && <p className="text-sm text-brand-slate/70 italic">None logged yet.</p>}
        {meetings.map((m) => (
          <div key={m.id} className="mb-4 pb-4 border-b border-brand-pale last:border-0">
            <form action={saveMeeting.bind(null, clientId)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="hidden" name="id" value={m.id} />
              <Field label="Type">
                <Select name="type" defaultValue={m.type}>
                  {MEETING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Scheduled date">
                <TextInput type="date" name="scheduledAt" defaultValue={m.scheduledAt ?? ""} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={m.status}>
                  {MEETING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MEETING_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Next meeting date">
                <TextInput type="date" name="nextMeetingDate" defaultValue={m.nextMeetingDate ?? ""} />
              </Field>
              <Field label="Coach notes" hint="Private — never shown to the client.">
                <TextArea name="coachNotes" rows={3} defaultValue={m.coachNotes ?? ""} />
              </Field>
              <Field label="Client action items" hint="Shown to the client.">
                <TextArea name="clientActionItems" rows={3} defaultValue={m.clientActionItems ?? ""} />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </div>
            </form>
            <form action={removeMeeting.bind(null, clientId)} className="mt-2">
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variant="danger" className="text-xs px-2 py-1">
                Remove
              </Button>
            </form>
          </div>
        ))}
      </Card>
    </div>
  );
}
