// Shared "normalize any recurring amount to a monthly figure" math — used by
// both Income (§4, per-source normalized_monthly) and Regular Bills (§4,
// monthly_equivalent for non-monthly bills). Pure summation, no strategy —
// see §4 "Field option sets and calculated values."

export const FREQUENCY_OPTIONS = [
  "Weekly",
  "Biweekly",
  "Semi-monthly",
  "Monthly",
  "Quarterly",
  "Annually",
  "One-time",
] as const;
export type Frequency = (typeof FREQUENCY_OPTIONS)[number];

export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency as Frequency) {
    case "Weekly":
      return (amount * 52) / 12;
    case "Biweekly":
      return (amount * 26) / 12;
    case "Semi-monthly":
      return amount * 2;
    case "Monthly":
      return amount;
    case "Quarterly":
      return amount / 3;
    case "Annually":
      return amount / 12;
    case "One-time":
      return 0; // doesn't recur, so it doesn't contribute to a monthly figure
    default:
      return amount;
  }
}
