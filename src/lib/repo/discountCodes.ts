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

// Case-insensitive — used to pre-check uniqueness before insert/update so
// the coach gets a clear "that code already exists" message instead of a
// raw UNIQUE-constraint 500 from the DB. excludeId lets an edit save
// without tripping over the row's own current code.
export async function findDiscountCodeByCode(code: string, excludeId?: string): Promise<DiscountCodeRow | undefined> {
  const row = excludeId
    ? await get<DiscountCodeDbRow>("SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($code) AND id != $excludeId", {
        $code: code,
        $excludeId: excludeId,
      })
    : await get<DiscountCodeDbRow>("SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($code)", { $code: code });
  return row ? fromRow(row) : undefined;
}

// Coach-added seasonal/promo codes (Coach Settings → Discount Codes). New
// codes start disabled — Coach flips them on when the promotion actually
// starts, same as the seeded codes above.
export async function createDiscountCode(params: { code: string; percentOff: number }): Promise<DiscountCodeRow> {
  const id = newId();
  await run(
    `INSERT INTO discount_codes (id, code, percent_off, enabled, created_at) VALUES ($id, $code, $percentOff, 0, $now)`,
    { $id: id, $code: params.code, $percentOff: params.percentOff, $now: nowIso() }
  );
  const row = await get<DiscountCodeDbRow>("SELECT * FROM discount_codes WHERE id = $id", { $id: id });
  return fromRow(row!);
}

export async function updateDiscountCode(id: string, params: { code: string; percentOff: number }) {
  await run(`UPDATE discount_codes SET code = $code, percent_off = $percentOff WHERE id = $id`, {
    $id: id,
    $code: params.code,
    $percentOff: params.percentOff,
  });
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
