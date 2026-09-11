import { requireClient } from "@/lib/dal";
import { Card, Button } from "@/components/ui";
import { SectionHeader, SectionFooterNav, EmptyState } from "../shared";
import { listStatements } from "@/lib/repo/statements";
import { listFinancialAccounts } from "@/lib/repo/financialAccounts";
import { formatStatementMonth } from "@/lib/statementMonths";
import { removeStatement } from "./actions";
import { UploadStatementForm } from "./UploadStatementForm";

export default async function StatementsPage() {
  const user = await requireClient();
  if (!user.client) return null;
  const clientId = user.client.id;

  const [statements, accounts] = await Promise.all([listStatements(clientId), listFinancialAccounts(clientId)]);

  return (
    <div>
      <SectionHeader label="Statements" locked={false} />
      <p className="text-sm text-brand-slate mb-4">
        Upload recent bank or account statements so Coach can review your actual spending — this is separate from
        the numbers you enter under Accounts, and helps Coach spot things a summary alone won&apos;t show.
      </p>

      <div className="bg-brand-pale/40 rounded-md px-4 py-3 mb-4 text-sm text-brand-dark">
        <p className="font-medium mb-1">What to upload</p>
        <ul className="list-disc list-inside space-y-0.5 text-brand-slate">
          <li>Checking &amp; savings accounts — your last 3 months of statements</li>
          <li>Credit card accounts — at least your most recent month&apos;s statement</li>
        </ul>
        <p className="text-xs text-brand-slate/70 mt-2">
          You can select multiple files at once and upload all months for an account together.
        </p>
      </div>

      {statements.length === 0 && <EmptyState>No statements uploaded yet.</EmptyState>}

      {statements.length > 0 && (
        <Card className="mb-4 p-0 overflow-hidden">
          <ul className="divide-y divide-brand-pale">
            {statements.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-brand-dark">
                    {s.accountNickname}
                    {formatStatementMonth(s.month) ? ` — ${formatStatementMonth(s.month)}` : ""}
                  </p>
                  <p className="text-xs text-brand-slate/70">
                    Uploaded {new Date(s.uploadedAt).toLocaleDateString()}
                    {s.originalFilename ? ` · ${s.originalFilename}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/statements/${s.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-dark underline hover:no-underline"
                  >
                    Preview
                  </a>
                  <a
                    href={`/api/statements/${s.id}/download?dl=1`}
                    className="text-sm text-brand-slate/70 underline hover:no-underline"
                  >
                    Download
                  </a>
                  <form action={removeStatement}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="danger">
                      Remove
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <UploadStatementForm clientId={clientId} accountOptions={accounts.map((a) => a.nickname)} />

      <SectionFooterNav currentHref="statements" />
    </div>
  );
}
