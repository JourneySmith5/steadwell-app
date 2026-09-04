import Link from "next/link";
import { requireClient } from "@/lib/dal";
import { listStatements } from "@/lib/repo/statements";
import { listMessageAttachmentsForClient } from "@/lib/repo/messages";
import { formatStatementMonth } from "@/lib/statementMonths";
import { Card, PageHeader } from "@/components/ui";

// A read-only "everything you've sent us" reference — not an upload spot
// itself. Statements are uploaded from Foundation Intake → Statements
// (they need an account/month to be organized against); a message
// attachment is uploaded from the Messages thread (it doesn't have that
// context — see the schema.sql comment on messages.attachment_url). This
// page just brings both lists together so there's one place to find a
// file again later, without duplicating either upload flow.
export default async function DocumentsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const clientId = user.client.id;

  const [statements, attachments] = await Promise.all([
    listStatements(clientId),
    listMessageAttachmentsForClient(clientId),
  ]);

  return (
    <div>
      <PageHeader title="Documents" subtitle="Everything you've sent us — statements and files attached to a message." />

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-brand-dark">Statements</h2>
          <Link href="/portal/foundation/statements" className="text-xs text-brand-slate hover:underline">
            Upload a statement →
          </Link>
        </div>
        {statements.length === 0 && <p className="text-sm text-brand-slate/70 italic">No statements uploaded yet.</p>}
        {statements.length > 0 && (
          <ul className="divide-y divide-brand-pale">
            {statements.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-brand-dark">
                  {s.accountNickname}
                  {formatStatementMonth(s.month) ? ` — ${formatStatementMonth(s.month)}` : ""}
                  {s.originalFilename && <span className="text-brand-slate/60"> ({s.originalFilename})</span>}
                </span>
                <a href={`/api/statements/${s.id}/download`} target="_blank" rel="noopener noreferrer" className="text-brand-dark underline hover:no-underline shrink-0 ml-3">
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-brand-dark">Message Attachments</h2>
          <Link href="/portal/messages" className="text-xs text-brand-slate hover:underline">
            Go to Messages →
          </Link>
        </div>
        {attachments.length === 0 && <p className="text-sm text-brand-slate/70 italic">No files attached to a message yet.</p>}
        {attachments.length > 0 && (
          <ul className="divide-y divide-brand-pale">
            {attachments.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-brand-dark">
                  {m.attachmentFilename ?? "Attachment"}
                  <span className="text-brand-slate/60"> — {new Date(m.createdAt).toLocaleDateString()}</span>
                </span>
                <a href={`/api/messages/${m.id}/attachment`} target="_blank" rel="noopener noreferrer" className="text-brand-dark underline hover:no-underline shrink-0 ml-3">
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
