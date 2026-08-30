import { get, all, run, newId, nowIso } from "@/lib/db/client";

export interface StatementRow {
  id: string;
  clientId: string;
  accountNickname: string;
  month: string;
  fileUrl: string;
  originalFilename: string | null;
  uploadedAt: string;
}

interface StatementDbRow {
  id: string;
  client_id: string;
  account_nickname: string;
  month: string;
  file_url: string;
  original_filename: string | null;
  uploaded_at: string;
}

function fromRow(row: StatementDbRow): StatementRow {
  return {
    id: row.id,
    clientId: row.client_id,
    accountNickname: row.account_nickname,
    month: row.month,
    fileUrl: row.file_url,
    originalFilename: row.original_filename,
    uploadedAt: row.uploaded_at,
  };
}

export async function listStatements(clientId: string): Promise<StatementRow[]> {
  const rows = await all<StatementDbRow>(
    `SELECT * FROM statements WHERE client_id = $clientId ORDER BY uploaded_at DESC`,
    { $clientId: clientId }
  );
  return rows.map(fromRow);
}

export async function findStatementById(id: string): Promise<StatementRow | undefined> {
  const row = await get<StatementDbRow>(`SELECT * FROM statements WHERE id = $id`, { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function createStatement(params: {
  clientId: string;
  accountNickname: string;
  month: string;
  fileUrl: string;
  originalFilename: string | null;
}): Promise<StatementRow> {
  const id = newId();
  await run(
    `INSERT INTO statements (id, client_id, account_nickname, month, file_url, original_filename, uploaded_at)
     VALUES ($id, $clientId, $accountNickname, $month, $fileUrl, $originalFilename, $now)`,
    {
      $id: id,
      $clientId: params.clientId,
      $accountNickname: params.accountNickname,
      $month: params.month,
      $fileUrl: params.fileUrl,
      $originalFilename: params.originalFilename,
      $now: nowIso(),
    }
  );
  return (await findStatementById(id))!;
}

export async function deleteStatement(id: string): Promise<void> {
  await run(`DELETE FROM statements WHERE id = $id`, { $id: id });
}
