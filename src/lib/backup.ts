import "server-only";
import { all } from "@/lib/db/client";

// Build order step 14 ("backups") — a real, working manual backup: every
// table, every row, as one JSON file. There's no automated backup schedule
// in this dev environment (same category of gap as no real cron for the
// Offboarding sweeps — see README "Before this goes live"), so this is the
// honest stand-in: Coach can pull a full point-in-time export on demand from
// the Dashboard. A real production deployment on Postgres should replace
// this with real automated backups (continuous WAL archiving / periodic
// pg_dump to off-site storage) — this on-demand export is a reasonable
// manual safety net, not a substitute for that.
//
// Table names come from Postgres's own catalog (information_schema) rather
// than a hard-coded list, so this stays accurate as the schema grows without
// needing to be kept in sync by hand. (Originally read SQLite's
// sqlite_master before the Postgres migration — same idea, different
// catalog table.)
//
// Handle the output file carefully: it contains everything in the database,
// including bcrypt password hashes and TOTP secrets — real backups always
// carry sensitive data like this, which is exactly why access to them (not
// just to the live app) has to be controlled. Store/transmit it the way
// you'd store/transmit the production database itself.
export async function buildFullBackup(): Promise<{ generatedAt: string; tables: Record<string, unknown[]> }> {
  const tableRows = await all<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  );
  const tableNames = tableRows.map((row) => row.table_name);

  const tables: Record<string, unknown[]> = {};
  for (const name of tableNames) {
    // Table names here come from Postgres's own catalog, never user input —
    // safe to interpolate directly (same reasoning as the equivalent line
    // this replaced under sqlite_master).
    tables[name] = await all(`SELECT * FROM "${name}"`);
  }
  return { generatedAt: new Date().toISOString(), tables };
}
