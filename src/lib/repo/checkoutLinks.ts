import { run, get, newId, nowIso } from "@/lib/db/client";
import { randomBytes } from "node:crypto";

interface CheckoutLinkDbRow {
  id: string;
  client_id: string;
  token: string;
  resent_count: number;
  created_at: string;
}

export interface CheckoutLinkRow {
  id: string;
  clientId: string;
  token: string;
  resentCount: number;
  createdAt: string;
}

function fromRow(row: CheckoutLinkDbRow): CheckoutLinkRow {
  return {
    id: row.id,
    clientId: row.client_id,
    token: row.token,
    resentCount: row.resent_count,
    createdAt: row.created_at,
  };
}

// Unlike an invitation, this link isn't single-use — a prospect may read the
// agreement, close the tab, and come back to pay later. Validity is gated by
// the client's current status (see /agreement/[token]/page.tsx), not by the
// link itself expiring.
export async function createCheckoutLink(clientId: string): Promise<CheckoutLinkRow> {
  const existing = await findCheckoutLinkByClientId(clientId);
  if (existing) return existing;
  const id = newId();
  const token = randomBytes(24).toString("hex");
  await run(`INSERT INTO checkout_links (id, client_id, token, created_at) VALUES ($id, $clientId, $token, $now)`, {
    $id: id,
    $clientId: clientId,
    $token: token,
    $now: nowIso(),
  });
  return (await findCheckoutLinkById(id))!;
}

export async function findCheckoutLinkById(id: string): Promise<CheckoutLinkRow | undefined> {
  const row = await get<CheckoutLinkDbRow>("SELECT * FROM checkout_links WHERE id = $id", { $id: id });
  return row ? fromRow(row) : undefined;
}

export async function findCheckoutLinkByToken(token: string): Promise<CheckoutLinkRow | undefined> {
  const row = await get<CheckoutLinkDbRow>("SELECT * FROM checkout_links WHERE token = $token", { $token: token });
  return row ? fromRow(row) : undefined;
}

export async function findCheckoutLinkByClientId(clientId: string): Promise<CheckoutLinkRow | undefined> {
  const row = await get<CheckoutLinkDbRow>("SELECT * FROM checkout_links WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

export async function bumpResendCount(clientId: string) {
  await run(`UPDATE checkout_links SET resent_count = resent_count + 1 WHERE client_id = $clientId`, {
    $clientId: clientId,
  });
}
