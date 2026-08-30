-- Steadwell — database schema
--
-- Dev runs this against SQLite via Node's built-in node:sqlite module (zero
-- native dependencies — see src/lib/db/client.ts and README "Going to
-- production" for why, and what changes to point this at Postgres).
--
-- Mirrors the Data Principles core object list (blueprint §12). Status/
-- category columns are plain TEXT validated in the app layer (see
-- src/lib/enums.ts) rather than native enums, so the eventual Postgres port
-- doesn't require redesigning anything — just re-running an equivalent DDL.

-- ---------------------------------------------------------------------------
-- Auth / identity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach','client')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verify_token TEXT UNIQUE,
  email_verify_expires_at TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  password_reset_token TEXT UNIQUE,
  password_reset_expires_at TEXT,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

-- ---------------------------------------------------------------------------
-- Client record — single source of truth (§12)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'applied',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'TX',
  preferred_contact TEXT NOT NULL,
  user_id TEXT UNIQUE REFERENCES users(id),
  plan_status TEXT NOT NULL DEFAULT 'not_started',
  plan_historical_spending_monthly DOUBLE PRECISION,
  plan_general_rationale TEXT,
  plan_finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

-- Moved below `clients` (was originally defined above it, right after
-- `users`) — Postgres, unlike SQLite, requires a REFERENCES target to
-- already exist at CREATE TABLE time, so `invitations` has to follow
-- `clients` now. Grouped here rather than back in "Auth / identity" since
-- that's where it now has to live.
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  resent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS status_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now())
);

-- ---------------------------------------------------------------------------
-- §3 Public Consultation Application
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  household_context TEXT NOT NULL,
  current_situation TEXT NOT NULL,
  household_income_structure TEXT NOT NULL,
  income_complexity_notes TEXT,
  challenge_areas TEXT NOT NULL, -- JSON array
  goals_next_12_months TEXT NOT NULL, -- JSON array, up to 3
  success_definition TEXT NOT NULL,
  current_tools TEXT NOT NULL,
  review_frequency TEXT,
  organization_notes TEXT,
  support_areas TEXT NOT NULL, -- JSON array
  existing_professionals TEXT NOT NULL,
  support_gap_notes TEXT,
  timeline TEXT,
  participation_notes TEXT,
  why_now TEXT,
  anything_else TEXT,
  tx_residency_confirmed INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL DEFAULT (now())
);

-- ---------------------------------------------------------------------------
-- §17 Engagement Agreement acceptance gate
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  agreement_version TEXT NOT NULL,
  accepted_name TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT (now()),
  ip_address TEXT
);

-- One secure, reusable (not single-use like invitations — a client may view
-- the agreement, leave, and come back before paying) link per client from
-- the approval email to the client-facing agreement + checkout flow. Same
-- shape as invitations (§2) but deliberately a separate table: this token is
-- valid pre-account, pre-payment, and stays valid across repeat visits.
CREATE TABLE IF NOT EXISTS checkout_links (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  token TEXT NOT NULL UNIQUE,
  resent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now())
);

-- ---------------------------------------------------------------------------
-- §9 Stripe & Billing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  discount_code TEXT,
  status TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_subscription_id TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  percent_off INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now())
);

-- ---------------------------------------------------------------------------
-- §4 Secure Financial Foundation Intake
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS foundation_intakes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  submitted_at TEXT,
  additional_info TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS household_members (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  income_included INTEGER NOT NULL,
  expenses_included INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS income_sources (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  person TEXT NOT NULL,
  source_name TEXT NOT NULL,
  type TEXT NOT NULL,
  take_home DOUBLE PRECISION NOT NULL,
  gross DOUBLE PRECISION,
  frequency TEXT NOT NULL,
  predictability TEXT NOT NULL,
  variable_typical DOUBLE PRECISION,
  variable_low DOUBLE PRECISION,
  variable_high DOUBLE PRECISION,
  normalized_monthly DOUBLE PRECISION,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  nickname TEXT NOT NULL,
  type TEXT NOT NULL,
  current_balance DOUBLE PRECISION NOT NULL,
  purpose TEXT
);

CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  account_nickname TEXT NOT NULL,
  month TEXT,
  file_url TEXT NOT NULL,
  original_filename TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS bills (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  frequency TEXT NOT NULL,
  due_date TEXT,
  fixed_or_variable TEXT NOT NULL,
  monthly_equivalent DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS debts (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  creditor TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DOUBLE PRECISION NOT NULL,
  apr DOUBLE PRECISION NOT NULL,
  minimum_payment DOUBLE PRECISION NOT NULL,
  due_date TEXT,
  promo_rate DOUBLE PRECISION,
  promo_expires_at TEXT
);

CREATE TABLE IF NOT EXISTS emergency_funds (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  current_balance DOUBLE PRECISION NOT NULL,
  target DOUBLE PRECISION NOT NULL,
  target_date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS savings (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  current_balance DOUBLE PRECISION NOT NULL,
  purpose TEXT
);

CREATE TABLE IF NOT EXISTS sinking_funds (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL,
  current_balance DOUBLE PRECISION NOT NULL,
  target_date TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  target DOUBLE PRECISION NOT NULL,
  current_amount DOUBLE PRECISION NOT NULL,
  has_deadline INTEGER NOT NULL,
  target_date TEXT,
  priority TEXT NOT NULL,
  why TEXT
);

-- ---------------------------------------------------------------------------
-- §5-8 Plan Builder / Cash-Flow Allocation / Coach-Driven Decisions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS allocation_lines (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  category TEXT NOT NULL,
  kind TEXT NOT NULL,
  historical_average DOUBLE PRECISION,
  planned_amount DOUBLE PRECISION NOT NULL,
  linked_debt_id TEXT,
  linked_goal_id TEXT,
  linked_sinking_fund_id TEXT
);

CREATE TABLE IF NOT EXISTS debt_decisions (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL UNIQUE REFERENCES debts(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  priority INTEGER NOT NULL,
  planned_payment DOUBLE PRECISION NOT NULL,
  strategy TEXT NOT NULL,
  rationale TEXT,
  months_to_payoff INTEGER,
  total_interest DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS insights (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  debt_id TEXT REFERENCES debts(id),
  area TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS action_items (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  description TEXT NOT NULL,
  amount DOUBLE PRECISION,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
);

-- ---------------------------------------------------------------------------
-- Meetings (Google Calendar Appointment Schedule handles scheduling UX —
-- this just records status/notes, §1a)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL,
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  coach_notes TEXT,
  client_action_items TEXT,
  next_meeting_date TEXT
);

-- ---------------------------------------------------------------------------
-- §16 Offboarding & Data Retention
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offboardings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
  triggered_at TEXT NOT NULL DEFAULT (now()),
  deletion_due_at TEXT NOT NULL,
  exported_at TEXT,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_status_events_client ON status_events(client_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_client ON email_logs(client_id);

-- ---------------------------------------------------------------------------
-- Additive migrations
-- ---------------------------------------------------------------------------
-- This schema has no real migration runner — initSchema() (src/lib/db/
-- client.ts) just re-runs this whole file against whatever database is
-- already there, and every statement above is a no-op once the tables
-- already exist (CREATE TABLE IF NOT EXISTS). That's fine for adding a new
-- table, but adding a COLUMN to a table that's already live in production
-- needs an explicit ALTER TABLE — the CREATE TABLE block above only takes
-- effect on a genuinely fresh database. Put any future additive column
-- changes here, following the same pattern.
ALTER TABLE statements ADD COLUMN IF NOT EXISTS original_filename TEXT;
-- Month labeling turned out to be the wrong shape: one label was getting
-- forced onto an entire batch of files (e.g. 3 months' worth uploaded
-- together), which is actively misleading rather than just unlabeled.
-- Dropped from the upload form; Coach opens each file to see its real
-- period. Existing rows keep whatever month they already have.
ALTER TABLE statements ALTER COLUMN month DROP NOT NULL;
