import { run, get, all, newId, nowIso } from "@/lib/db/client";

interface DiscountCodeDbRow {
  id: string;
  code: string;
  percent_off: number;
  enabled: number;
  max_redemptions: number | null;
  redemption_count: number;
  created_at: string;
}

export interface DiscountCodeRow {
  id: string;
  code: string;
  percentOff: number;
  enabled: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  createdAt: string;
}

function fromRow(row: DiscountCodeDbRow): DiscountCodeRow {
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    enabled: !!row.enabled,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    createdAt: row.created_at,
  };
}

export async function listDiscountCodes(): Promise<DiscountCodeRow[]> {
  const rows = await all<DiscountCodeDbRow>("SELECT * FROM discount_codes ORDER BY code");
  return rows.map(fromRow);
}

// Case-insensitive lookup — clients will type these in every casing
// imaginable. A one-time code (max_redemptions = 1) stops matching the
// moment it's been redeemed once — see incrementRedemptionCount, called
// from fulfillFoundationPayment the moment a payment actually completes,
// not when it's merely typed in at checkout.
export async function findActiveDiscountCode(code: string): Promise<DiscountCodeRow | undefined> {
  const row = await get<DiscountCodeDbRow>(
    `SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($code) AND enabled = 1
     AND (max_redemptions IS NULL OR redemption_count < max_redemptions)`,
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

const ONE_TIME_SUFFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easier to read aloud or over text

function randomSuffix(length = 5): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += ONE_TIME_SUFFIX_CHARS[Math.floor(Math.random() * ONE_TIME_SUFFIX_CHARS.length)];
  }
  return s;
}

// One-time codes spawned from a "template" code (FAMILY90, FRIENDS50,
// CHARITY100 — Coach Settings decides which codes get this button; see
// ONE_TIME_TEMPLATE_CODES in the Discount Codes page). Each call creates a
// brand-new, unique code good for exactly one redemption, so Coach hands
// out a code good for exactly one person instead of toggling a shared code
// on/off around their specific use — the old way left a real window where
// anyone who saw FAMILY90 enabled could redeem it too. Left enabled
// permanently since a one-time code can never be redeemed a second time
// regardless — nothing to remember to toggle off.
export async function generateOneTimeCode(baseCode: string, percentOff: number): Promise<DiscountCodeRow> {
  let code: string | null = null;
  for (let attempt = 0; attempt < 10 && !code; attempt++) {
    const candidate = `${baseCode}-${randomSuffix()}`;
    if (!(await findDiscountCodeByCode(candidate))) code = candidate;
  }
  if (!code) throw new Error(`Could not generate a unique one-time code for ${baseCode}.`);

  const id = newId();
  await run(
    `INSERT INTO discount_codes (id, code, percent_off, enabled, max_redemptions, redemption_count, created_at)
     VALUES ($id, $code, $percentOff, 1, 1, 0, $now)`,
    { $id: id, $code: code, $percentOff: percentOff, $now: nowIso() }
  );
  const row = await get<DiscountCodeDbRow>("SELECT * FROM discount_codes WHERE id = $id", { $id: id });
  return fromRow(row!);
}

// Called once a payment actually completes (see fulfillFoundationPayment in
// src/lib/checkout.ts) — never at checkout start, since a client typing a
// code and then abandoning checkout shouldn't burn a one-time use. A no-op
// for any code without a redemption cap (THANKYOU15, BIRTHDAY20, and any
// code Coach never generated as one-time), so it's always safe to call for
// every code that was applied to a payment, one-time or not.
export async function incrementRedemptionCount(code: string) {
  await run(
    `UPDATE discount_codes SET redemption_count = redemption_count + 1
     WHERE UPPER(code) = UPPER($code) AND max_redemptions IS NOT NULL`,
    { $code: code }
  );
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
