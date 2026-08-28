import "server-only";
import { run, get, nowIso, withTransaction } from "@/lib/db/client";

// §16: "a scheduled job that does not check export status — it deletes
// anything past its 30-day mark regardless." §12: "until the client's
// 30-day post-exit window closes, at which point full deletion applies."
//
// Every one of these tables has a direct client_id column (see
// schema.sql) — this list is every table in the schema except `clients`,
// `users`, and `offboardings` itself, which are handled specially below.
// Order matters only where a table has a foreign key to another
// client-owned table: debt_decisions and insights both reference
// debts(id), so they're deleted before debts. Everything else only
// references clients(id), so order between them is arbitrary.
const CHILD_TABLES_BY_CLIENT_ID = [
  "debt_decisions",
  "insights",
  "allocation_lines",
  "action_items",
  "meetings",
  "subscriptions",
  "payments",
  "statements",
  "sinking_funds",
  "savings",
  "goals",
  "emergency_funds",
  "debts",
  "bills",
  "financial_accounts",
  "income_sources",
  "household_members",
  "foundation_intakes",
  "agreement_acceptances",
  "checkout_links",
  "invitations",
  "email_logs",
  "status_events",
  "applications",
] as const;

// The one-time, irreversible action behind the client-facing "permanently
// deleted" language (§16). Runs as a transaction so a failure partway
// through can't leave a client half-deleted.
//
// The `clients` row itself is NOT deleted, and neither is this client's
// `offboardings` row — both stay as a minimal tombstone. This isn't a
// loophole: `offboardings` is literally the audit record of the deletion
// event (deleted_at), and since it has a foreign-key reference to
// `clients(id)`, the client row has to exist for that record to exist at
// all. Every field that actually identifies or describes the person —
// name, email, phone, city, and anything they told Coach about their
// plan priorities — is overwritten below, so what's left behind is an
// opaque id with a deletion timestamp, not a usable record.
export async function hardDeleteClient(clientId: string): Promise<void> {
  await withTransaction(async () => {
    for (const table of CHILD_TABLES_BY_CLIENT_ID) {
      await run(`DELETE FROM ${table} WHERE client_id = $clientId`, { $clientId: clientId });
    }

    // clients.user_id has a foreign key to users(id), so the reference has
    // to be cleared before the users row it points to can be deleted —
    // capture the id first, since it's gone from the clients row after
    // the UPDATE below.
    const clientRow = await get<{ user_id: string | null }>("SELECT user_id FROM clients WHERE id = $clientId", {
      $clientId: clientId,
    });
    await run(`UPDATE clients SET user_id = NULL WHERE id = $clientId`, { $clientId: clientId });
    if (clientRow?.user_id) {
      await run(`DELETE FROM users WHERE id = $userId`, { $userId: clientRow.user_id });
    }

    await run(
      `UPDATE clients SET
         full_name = '[deleted]',
         email = $anonEmail,
         phone = '',
         city = '',
         plan_historical_spending_monthly = NULL,
         plan_general_rationale = NULL,
         updated_at = $now
       WHERE id = $clientId`,
      { $clientId: clientId, $anonEmail: `deleted-${clientId}@steadwell.invalid`, $now: nowIso() }
    );
  });
}
