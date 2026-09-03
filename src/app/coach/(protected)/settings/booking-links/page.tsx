import { requireOwner } from "@/lib/dal";
import { listBookingLinks, SYSTEM_BOOKING_LINK_KEYS } from "@/lib/repo/bookingLinks";
import { Card, PageHeader, Field, TextInput, Button } from "@/components/ui";
import { saveBookingLink, addBookingLink, removeBookingLink } from "./actions";

export default async function BookingLinksPage() {
  await requireOwner();
  const links = await listBookingLinks();

  return (
    <div>
      <PageHeader
        title="Booking Links"
        subtitle="Google Calendar Appointment Schedule links, one per meeting type — used wherever the app tells a client to book a meeting."
      />

      <Card className="mb-6 p-0 overflow-hidden">
        <ul className="divide-y divide-brand-pale">
          {links.map((l) => {
            const isSystem = (SYSTEM_BOOKING_LINK_KEYS as readonly string[]).includes(l.key);
            return (
              <li key={l.id} className="px-6 py-4">
                <form action={saveBookingLink.bind(null, l.id)} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Field label="Label">
                    <TextInput name="label" defaultValue={l.label} required />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Booking URL" hint={l.url ? undefined : "Not set yet — falls back to generic text wherever this is used."}>
                      <TextInput name="url" type="url" defaultValue={l.url ?? ""} placeholder="https://calendar.app.google/..." />
                    </Field>
                  </div>
                  <div className="sm:col-span-3 flex items-center justify-between">
                    <span className="text-xs text-brand-slate/60">
                      key: {l.key}
                      {isSystem && " · used by the app"}
                    </span>
                    <Button type="submit" variant="secondary">
                      Save
                    </Button>
                  </div>
                </form>
                {!isSystem && (
                  <form action={removeBookingLink.bind(null, l.id, l.key)} className="mt-2">
                    <Button type="submit" variant="danger" className="text-xs px-2 py-1">
                      Remove
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Add a Custom Link</h2>
        <p className="text-sm text-brand-slate mb-3">
          For a meeting type the app doesn&apos;t look up automatically yet (e.g. a future offering) — it&apos;ll
          sit here as a reference until something reads it by key.
        </p>
        <form action={addBookingLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="Label">
            <TextInput name="label" required placeholder="e.g. Accolesce Intro Call" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Booking URL" hint="Optional — can be filled in later.">
              <TextInput name="url" type="url" placeholder="https://calendar.app.google/..." />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Add Link</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
