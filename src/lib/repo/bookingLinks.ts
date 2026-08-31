import { get, all, run, newId, nowIso } from "@/lib/db/client";

// The keys schema.sql seeds and app code actually reads by — kept here
// (not just in schema.sql) so both the Settings page and any code deciding
// whether a link is "system" (can't be deleted, only edited) agree on the
// same list. "foundation_intake" used to be a third seeded key here, but no
// code ever actually looked it up (no "book your Foundation Intake Meeting"
// touchpoint exists in the flow) — removed from both this list and the
// schema.sql seed; see the schema.sql migration that deletes the row from
// databases that already have it.
export const SYSTEM_BOOKING_LINK_KEYS = ["foundation_plan_review", "accountability"] as const;

export interface BookingLinkRow {
  id: string;
  key: string;
  label: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BookingLinkDbRow {
  id: string;
  key: string;
  label: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: BookingLinkDbRow): BookingLinkRow {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBookingLinks(): Promise<BookingLinkRow[]> {
  const rows = await all<BookingLinkDbRow>("SELECT * FROM booking_links ORDER BY created_at ASC");
  return rows.map(fromRow);
}

// The lookup every consumer (an email template, a portal page) uses — by
// the stable key, never the coach-editable label, so renaming a link in
// Settings never breaks whatever reads it. Returns null whether the link
// hasn't been filled in yet or the row doesn't exist at all — callers treat
// both the same: nothing to show, fall back to generic copy.
export async function findBookingLinkUrl(key: string): Promise<string | null> {
  const row = await get<BookingLinkDbRow>("SELECT * FROM booking_links WHERE key = $key", { $key: key });
  return row?.url || null;
}

export async function updateBookingLink(id: string, params: { label: string; url: string | null }) {
  await run(`UPDATE booking_links SET label = $label, url = $url, updated_at = $now WHERE id = $id`, {
    $id: id,
    $label: params.label,
    $url: params.url,
    $now: nowIso(),
  });
}

// Custom (non-system) links only — Coach adding one for a future offering
// (e.g. a not-yet-built Accolesce track) before any code exists to read it
// by key yet. Dedupes the auto-slugified key against what's already there
// so two links with the same label don't collide on the UNIQUE constraint.
export async function createBookingLink(params: { label: string; url: string | null }): Promise<BookingLinkRow> {
  const existingKeys = new Set((await listBookingLinks()).map((l) => l.key));
  const base = params.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "link";
  let key = base;
  let suffix = 2;
  while (existingKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }

  const id = newId();
  await run(
    `INSERT INTO booking_links (id, key, label, url, created_at, updated_at) VALUES ($id, $key, $label, $url, $now, $now)`,
    { $id: id, $key: key, $label: params.label, $url: params.url, $now: nowIso() }
  );
  return { id, key, label: params.label, url: params.url, createdAt: nowIso(), updatedAt: nowIso() };
}

export async function deleteBookingLink(id: string) {
  await run(`DELETE FROM booking_links WHERE id = $id`, { $id: id });
}
