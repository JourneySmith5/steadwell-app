// Central source of truth for every option set / status list in the
// blueprint, so the DB (plain strings) and the UI (typed selects) never
// drift apart. Cross-referenced by blueprint section in each comment.

// §11 Coach Admin Dashboard — pipeline
export const CLIENT_STATUSES = [
  "applied",
  "in_review",
  "approved",
  "declined",
  "payment_pending",
  "payment_received",
  "account_setup_pending",
  "foundation_intake",
  "foundation_intake_submitted",
  "plan_build",
  "plan_active",
  "accountability_active",
  "graduated",
  "canceled",
  "closed",
] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  applied: "Applied",
  in_review: "In Review",
  approved: "Approved",
  declined: "Declined",
  payment_pending: "Agreement Accepted — Payment Pending",
  payment_received: "Payment Received — Account Setup Pending",
  account_setup_pending: "Account Setup Pending",
  foundation_intake: "Foundation Intake",
  foundation_intake_submitted: "Foundation Intake — Submitted",
  plan_build: "Plan Build",
  plan_active: "Plan Active",
  accountability_active: "Accountability Active",
  graduated: "Graduated",
  canceled: "Canceled",
  closed: "Closed",
};

// Statuses that trigger the §16 offboarding flow uniformly.
export const OFFBOARDING_TRIGGER_STATUSES: ClientStatus[] = ["graduated", "canceled", "closed"];

// §3 Public Consultation Application — field option sets
export const CURRENT_SITUATION_OPTIONS = [
  "Financially stable",
  "Managing comfortably but want improvement",
  "Living paycheck to paycheck",
  "Struggling with debt",
  "Recovering from a financial setback",
  "Unsure where to start",
] as const;

export const HOUSEHOLD_INCOME_STRUCTURE_OPTIONS = [
  "One consistent income",
  "Multiple consistent incomes",
  "Variable or commission income",
  "Self-employed or business income",
  "Combination",
  "Other",
] as const;

export const SUPPORT_AREA_OPTIONS = [
  "Budget & cash flow",
  "Debt",
  "Saving",
  "Financial organization",
  "Spending habits",
  "Accountability",
  "Goal planning",
  "Family budgeting",
  "Other",
] as const;

export const CURRENT_TOOLS_OPTIONS = [
  "Spreadsheet",
  "Banking app",
  "Budgeting app",
  "Paper or notebook",
  "QuickBooks",
  "Other",
  "Nothing currently",
] as const;

export const EXISTING_PROFESSIONALS_OPTIONS = [
  "CPA/accountant",
  "Financial advisor",
  "Bookkeeper",
  "Other",
  "None",
] as const;

// §4 Foundation Intake — field option sets
export const INCOME_TYPE_OPTIONS = [
  "Employment",
  "Self-employment or business",
  "Commission or bonus",
  "Benefits",
  "Support or alimony",
  "Investment or passive",
  "Other",
] as const;

export const INCOME_PREDICTABILITY_OPTIONS = [
  "Consistent",
  "Usually consistent but varies",
  "Highly variable",
  "Irregular or occasional",
] as const;

export const GOAL_PRIORITY_OPTIONS = ["Essential", "Important", "Nice to have"] as const;

export const DEBT_STRATEGY_OPTIONS = ["Avalanche", "Snowball", "Hybrid", "Custom"] as const;

// Not explicitly enumerated in the blueprint (unlike income type/predictability
// above) — reasonable V1 defaults, easy to extend.
export const HOUSEHOLD_RELATIONSHIP_OPTIONS = [
  "Self",
  "Spouse/Partner",
  "Child",
  "Parent",
  "Other Relative",
  "Other",
] as const;

export const ACCOUNT_TYPE_OPTIONS = [
  "Checking",
  "Savings",
  "Credit Card",
  "Investment",
  "Cash",
  "Other",
] as const;

export const BILL_FIXED_OR_VARIABLE_OPTIONS = ["Fixed", "Variable"] as const;

export const DEBT_TYPE_OPTIONS = [
  "Credit Card",
  "Student Loan",
  "Auto Loan",
  "Personal Loan",
  "Medical Debt",
  "Mortgage/HELOC",
  "Other",
] as const;

// §4 Foundation Intake pipeline — separate from the client-level pipeline
// (ClientStatus) so a section can be individually unlocked for correction
// after submission without touching the client's overall stage.
export const FOUNDATION_INTAKE_STATUSES = ["in_progress", "submitted"] as const;
export type FoundationIntakeStatus = (typeof FOUNDATION_INTAKE_STATUSES)[number];

// §9 Stripe & Billing
export const ACCOUNTABILITY_TIERS = [
  { id: "steady", label: "Steady Accountability", priceCents: 7900, cadence: "1 meeting/month" },
  { id: "momentum", label: "Momentum Accountability", priceCents: 14900, cadence: "2 meetings/month" },
  { id: "intensive", label: "Intensive Accountability", priceCents: 24900, cadence: "weekly meetings" },
] as const;

export const FOUNDATION_FEE_CENTS = 39900;

// §9 payment state machine — a payment's lifecycle regardless of whether it
// went through real Stripe or the test-mode stand-in (see src/lib/stripe.ts).
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// §9 subscription state machine (Accountability tiers — wired up in build
// order step 12; the shape is defined now since it shares the same
// Stripe-webhook plumbing as the Foundation payment).
export const SUBSCRIPTION_STATUSES = ["active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
};

// §17 — bump this if the agreement text changes; recorded on every
// acceptance so old acceptances stay tied to the version they actually saw.
export const AGREEMENT_VERSION = "2026-08-28";

// §9 discount codes — seeded by scripts/seed.ts, disabled by default,
// coach toggles them on/off from /coach/settings/discount-codes.
export const SEED_DISCOUNT_CODES = [
  { code: "FAMILY100", percentOff: 100 },
  { code: "FRIENDS50", percentOff: 50 },
] as const;

// §5-§8 Plan Builder — plan_status lives directly on the client row (one
// plan per client — see clients.plan_status), separate from the client
// pipeline status (ClientStatus). "not_started" is the schema default before
// Coach ever opens the Plan Builder; it flips to "draft" automatically the
// first time they do (see ensurePlanStarted in src/lib/repo/clients.ts).
export const PLAN_STATUSES = ["not_started", "draft", "reviewed", "finalized", "active"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  not_started: "Not Started",
  draft: "Draft",
  reviewed: "Reviewed",
  finalized: "Finalized",
  active: "Active",
};

// §6 Cash-Flow Allocation Workspace — default flexible living-expense
// categories seeded the first time Coach opens the workspace; Coach can add
// custom ones and remove any of these.
export const DEFAULT_FLEX_CATEGORIES = ["Groceries", "Gas / Transportation", "Personal Spending", "Entertainment / Discretionary"] as const;

// allocation_lines.kind — flex categories, Emergency Fund, and Sinking Funds
// all share this one table (§6). Debt Acceleration and Goals aren't stored
// here: debts get their own debt_decisions row (§7, Stage 4) and goals get
// an allocation_lines row of kind "goal" linked via linked_goal_id — kept in
// this table since, unlike debt, goals don't need the extra strategy/
// priority/trajectory fields debt_decisions carries.
export const ALLOCATION_KINDS = ["flex", "emergency", "sinking", "goal"] as const;
export type AllocationKind = (typeof ALLOCATION_KINDS)[number];

// §8 First 30 Days action items
export const ACTION_ITEM_STATUSES = ["not_started", "in_progress", "complete"] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

// §7 Coach-Driven Decisions — informational-only insight areas.
export const INSIGHT_AREAS = ["debt", "goal"] as const;
export type InsightArea = (typeof INSIGHT_AREAS)[number];

// §1a, §11 Meetings — Google Calendar's Appointment Schedule handles actual
// booking (not built here, deliberately — see blueprint §14); the app just
// records status/notes/action items "where practical."
export const MEETING_TYPES = ["Foundation", "Accountability"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_STATUSES = ["scheduled", "completed", "canceled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  canceled: "Canceled",
};

// Roles
export const USER_ROLES = ["coach", "client"] as const;
export type UserRole = (typeof USER_ROLES)[number];
