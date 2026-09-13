// Shared between the client's Statements upload form (src/app/portal/
// (protected)/foundation/statements) and Coach's view of a client's
// uploaded statements (src/app/coach/(protected)/clients/[id]) — lives here
// rather than in either route tree since both sides need it.

// Display formatter for a stored "YYYY-MM" value. Month labeling was
// dropped from the upload form (see schema.sql's "Additive migrations"
// note) — new statements have no month, so this returns null for that case
// and callers just omit the month suffix entirely. Falls back to the raw
// value for anything present but unparseable.
export function formatStatementMonth(month: string | null): string | null {
  if (!month) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

// Account nickname was dropped from the upload form for the same reason
// month was above — see schema.sql's "Additive migrations" note. New
// statements have no account_nickname; existing rows keep whatever they
// already have. This is the one place that turns (accountNickname, month)
// into what a statements list actually shows, so the several call sites
// (client's own Statements page, client's Documents page, Coach's client
// page, Coach's Plan page) don't each grow their own fallback logic.
export function formatStatementLabel(accountNickname: string | null, month: string | null): string {
  return [accountNickname, formatStatementMonth(month)].filter(Boolean).join(" — ") || "Statement";
}
