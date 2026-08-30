import { requireClient } from "@/lib/dal";
import { Card, Button, Field, TextInput, Select, ErrorText } from "@/components/ui";
import { SectionHeader, SectionFooterNav, EmptyState } from "../shared";
import { listStatements } from "@/lib/repo/statements";
import { listFinancialAccounts } from "@/lib/repo/financialAccounts";
import { formatStatementMonth } from "@/lib/statementMonths";
import { uploadStatement, removeStatement } from "./actions";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
                  <a href={`/api/statements/${s.id}/download`} className="text-sm text-brand-dark underline hover:no-underline">
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

      <Card>
        <h2 className="font-heading text-lg text-brand-dark mb-3">Upload a Statement</h2>
        {error && <ErrorText>{error}</ErrorText>}
        <form action={uploadStatement} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4" encType="multipart/form-data">
          <Field label="Account" required>
            {accounts.length > 0 ? (
              <Select name="accountNickname" defaultValue={accounts[0].nickname} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.nickname}>
                    {a.nickname}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput name="accountNickname" placeholder="e.g. Chase Checking" required />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Files" required>
              <input
                type="file"
                name="files"
                multiple
                required
                accept=".pdf,.png,.jpg,.jpeg"
                className="block w-full text-sm text-brand-slate file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-brand-pale file:text-brand-dark file:text-sm file:font-medium hover:file:bg-brand-pale/70"
              />
              <p className="text-xs text-brand-slate/60 mt-1">
                Select multiple files at once (e.g. ctrl/cmd-click) — no need to label or separate them by month.
              </p>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Upload</Button>
          </div>
        </form>
      </Card>

      <SectionFooterNav currentHref="statements" />
    </div>
  );
}
