// Shared between the client's Statements upload form (src/app/portal/
// (protected)/foundation/statements) and Coach's view of a client's
// uploaded statements (src/app/coach/(protected)/clients/[id]) — lives here
// rather than in either route tree since both sides need it.

// Statements only ever needs a recent month, not the endless free-scrolling
// calendar a bare <input type="month"> gives — a client picking last
// October ends up scrolling through a year of months to get there. Values
// are "YYYY-MM" (same shape the old <input type="month"> produced, so
// nothing downstream needed to change), newest first.
export function recentMonthOptions(count: number): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { value, label };
  });
}

// Display formatter for a stored "YYYY-MM" value. Falls back to the raw
// value for anything that doesn't match.
export function formatStatementMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}
