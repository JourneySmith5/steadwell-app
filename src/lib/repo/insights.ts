import { run, all, newId } from "@/lib/db/client";
import type { InsightArea } from "@/lib/enums";

interface InsightDbRow {
  id: string;
  client_id: string;
  debt_id: string | null;
  area: string;
  text: string;
  created_at: string;
}

export interface InsightRow {
  id: string;
  clientId: string;
  debtId: string | null;
  area: InsightArea;
  text: string;
  createdAt: string;
}

function fromRow(row: InsightDbRow): InsightRow {
  return {
    id: row.id,
    clientId: row.client_id,
    debtId: row.debt_id,
    area: row.area as InsightArea,
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function listInsights(clientId: string, area: InsightArea): Promise<InsightRow[]> {
  const rows = await all<InsightDbRow>("SELECT * FROM insights WHERE client_id = $clientId AND area = $area ORDER BY seq", {
    $clientId: clientId,
    $area: area,
  });
  return rows.map(fromRow);
}

// §7: insights are informational-only and have no accept/modify/reject
// workflow — they're just recomputed from current data every time Coach
// opens the relevant page, so "replace" (not append) is the right shape:
// delete whatever this area's insights were, recompute, store the fresh set.
export async function replaceInsights(clientId: string, area: InsightArea, texts: { text: string; debtId?: string | null }[]) {
  await run(`DELETE FROM insights WHERE client_id = $clientId AND area = $area`, { $clientId: clientId, $area: area });
  for (const t of texts) {
    await run(`INSERT INTO insights (id, client_id, debt_id, area, text) VALUES ($id, $clientId, $debtId, $area, $text)`, {
      $id: newId(),
      $clientId: clientId,
      $debtId: t.debtId ?? null,
      $area: area,
      $text: t.text,
    });
  }
}
