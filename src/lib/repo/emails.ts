import { run, get, all, newId, nowIso } from "@/lib/db/client";

export interface EmailLogRow {
  id: string;
  clientId: string;
  template: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  sentAt: string | null;
  attachPlanPdf: boolean;
  createdAt: string;
}

interface EmailDbRow {
  id: string;
  client_id: string;
  template: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string | null;
  attach_plan_pdf: number;
  created_at: string;
}

function fromRow(row: EmailDbRow): EmailLogRow {
  return {
    id: row.id,
    clientId: row.client_id,
    template: row.template,
    subject: row.subject,
    body: row.body,
    status: row.status as "draft" | "sent",
    sentAt: row.sent_at,
    attachPlanPdf: !!row.attach_plan_pdf,
    createdAt: row.created_at,
  };
}

// attachPlanPdf: true regenerates the client's finalized plan as a PDF at
// send time and attaches it — see sendEmailDraft (src/lib/email.ts). Not
// stored as a file: the plan is immutable once finalized (same "point-in-
// time snapshot, regenerated on request" approach as /portal/plan/pdf), so
// there's nothing to keep in sync by generating it fresh each send.
export async function createEmailDraft(params: {
  clientId: string;
  template: string;
  subject: string;
  body: string;
  attachPlanPdf?: boolean;
}) {
  const id = newId();
  await run(
    `INSERT INTO email_logs (id, client_id, template, subject, body, status, attach_plan_pdf, created_at)
     VALUES ($id, $clientId, $template, $subject, $body, 'draft', $attachPlanPdf, $now)`,
    {
      $id: id,
      $clientId: params.clientId,
      $template: params.template,
      $subject: params.subject,
      $body: params.body,
      $attachPlanPdf: params.attachPlanPdf ? 1 : 0,
      $now: nowIso(),
    }
  );
  return (await findEmailById(id))!;
}

export async function findEmailById(id: string): Promise<EmailLogRow | undefined> {
  const row = await get<EmailDbRow>("SELECT * FROM email_logs WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function listEmailsForClient(clientId: string): Promise<EmailLogRow[]> {
  const rows = await all<EmailDbRow>("SELECT * FROM email_logs WHERE client_id = $clientId ORDER BY created_at DESC", {
    $clientId: clientId,
  });
  return rows.map(fromRow);
}

export async function markEmailSent(id: string, subject: string, body: string) {
  await run(
    `UPDATE email_logs SET subject = $subject, body = $body, status = 'sent', sent_at = $now WHERE id = $id`,
    { $id: id, $subject: subject, $body: body, $now: nowIso() }
  );
  return (await findEmailById(id))!;
}
