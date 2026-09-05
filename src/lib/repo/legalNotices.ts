import { get, all, run, newId, nowIso } from "@/lib/db/client";
import type { LegalDocument } from "@/lib/enums";

// Agreement §14.2 / Terms §15's 30-day advance-notice requirement for a
// material change — see src/lib/legalNotices.ts for the actual
// creation/notification logic and the 30-day minimum it enforces before
// ever calling insertLegalNotice below. This file is the plain repo layer.
// LEGAL_DOCUMENTS/LegalDocument/LEGAL_DOCUMENT_LABELS live in
// src/lib/enums.ts, not here (a type-only import, erased at compile time) —
// this file pulls in db/client.ts (real Postgres), so anything a Client
// Component needs (PublishNoticeForm) has to come from enums.ts directly
// instead of through here, or the whole `pg` driver ends up in the browser
// bundle.

export interface LegalNoticeRow {
  id: string;
  document: LegalDocument;
  summary: string;
  effectiveDate: string;
  notifiedCount: number;
  createdAt: string;
}

interface LegalNoticeDbRow {
  id: string;
  document: string;
  summary: string;
  effective_date: string;
  notified_count: number;
  created_at: string;
}

function fromRow(row: LegalNoticeDbRow): LegalNoticeRow {
  return {
    id: row.id,
    document: row.document as LegalDocument,
    summary: row.summary,
    effectiveDate: row.effective_date,
    notifiedCount: row.notified_count,
    createdAt: row.created_at,
  };
}

export async function insertLegalNotice(params: {
  document: LegalDocument;
  summary: string;
  effectiveDate: string;
}): Promise<LegalNoticeRow> {
  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO legal_notices (id, document, summary, effective_date, notified_count, created_at)
     VALUES ($id, $document, $summary, $effectiveDate, 0, $now)`,
    { $id: id, $document: params.document, $summary: params.summary, $effectiveDate: params.effectiveDate, $now: now }
  );
  const row = await get<LegalNoticeDbRow>("SELECT * FROM legal_notices WHERE id = $id", { $id: id });
  return fromRow(row!);
}

export async function setLegalNoticeNotifiedCount(id: string, count: number) {
  await run(`UPDATE legal_notices SET notified_count = $count WHERE id = $id`, { $id: id, $count: count });
}

// Every notice whose effective date hasn't passed yet — what the Portal
// banner and the Settings page's "Upcoming" list both show. Ordered
// soonest-first; in practice there's realistically zero or one of these at
// a time, but the table doesn't assume that.
export async function listUpcomingLegalNotices(now: Date = new Date()): Promise<LegalNoticeRow[]> {
  const rows = await all<LegalNoticeDbRow>(
    "SELECT * FROM legal_notices WHERE effective_date >= $today ORDER BY effective_date ASC",
    { $today: now.toISOString().slice(0, 10) }
  );
  return rows.map(fromRow);
}

// Full history, newest-first — the Settings page's audit trail of every
// notice ever published, past effective date or not.
export async function listAllLegalNotices(): Promise<LegalNoticeRow[]> {
  const rows = await all<LegalNoticeDbRow>("SELECT * FROM legal_notices ORDER BY created_at DESC");
  return rows.map(fromRow);
}
