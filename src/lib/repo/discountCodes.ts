import { run, get, all, newId, nowIso } from "@/lib/db/client";

interface DiscountCodeDbRow {
  id: string;
  code: string;
  percent_off: number;
  enabled: number;
  created_at: string;
}

export interface DiscountCodeRow {
  id: string;
  code: string;
  percentOff: number;
  enabled: boolean;
  createdAt: string;
}

function fromRow(row: DiscountCodeDbRow): DiscountCodeRow {
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    enabled: !!row.enabled,
    createdAt: row.created_at,
  };
}

export async function listDiscountCodes(): Promise<DiscountCodeRow[]> {
  const rows = await all<DiscountCodeDbRow>("SELECT * FROM discount_codes ORDER BY code");
  return rows.map(fromRow);
}

// Case-insensitive lookup — clients will type these in every casing imaginable.
export async function findActiveDiscountCode(code: string): Promise<DiscountCodeRow | undefined> {
  const row = await get<DiscountCodeDbRow>(
    "SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($code) AND enabled = 1",
    { $code: code }
  );
  return row ? fromRow(row) : undefined;
}

export async function setDiscountCodeEnabled(id: string, enabled: boolean) {
  await run(`UPDATE discount_codes SET enabled = $enabled WHERE id = $id`, { $id: id, $enabled: enabled ? 1 : 0 });
}

// Seeds the two codes named in the blueprint (§9) if they don't exist yet.
// Disabled by default — Coach turns them on from /coach/settings/discount-codes.
// Safe to call on every seed run: does nothing once the codes already exist,
// and never re-enables a code the coach has since turned off.
export async function ensureSeedDiscountCodes(codes: { code: string; percentOff: number }[]) {
  for (const c of codes) {
    const existing = await get<DiscountCodeDbRow>("SELECT * FROM discount_codes WHERE code = $code", { $code: c.code });
    if (existing) continue;
    await run(
      `INSERT INTO discount_codes (id, code, percent_off, enabled, created_at) VALUES ($id, $code, $percentOff, 0, $now)`,
      { $id: newId(), $code: c.code, $percentOff: c.percentOff, $now: nowIso() }
    );
  }
}
