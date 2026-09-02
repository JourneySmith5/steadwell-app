import "server-only";
import { gzipSync } from "node:zlib";
import { del, list, put } from "@vercel/blob";
import { all } from "@/lib/db/client";

// Build order step 14 ("backups") — a real, working manual backup: every
// table, every row, as one JSON file. Coach can also pull this same export
// on demand from the Dashboard (src/app/coach/(protected)/backup/route.ts).
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

// Automated off-site backup, run nightly by src/app/api/cron/db-backup —
// closes the gap called out above: Supabase's Free plan takes no automated
// backups of its own (their docs' own recommendation for Free projects is
// "regularly export your data ... and maintain off-site backups", which is
// exactly what this does). Reuses buildFullBackup() so there's exactly one
// definition of "everything in the database" to keep in sync with the
// schema, then gzips it (this is plain JSON — it compresses hard) and stores
// it in the same private Blob store the app already uses for statements/plan
// exports, under access: "private" for the same reason as those: this is
// the whole database, including password hashes and TOTP secrets.
const BACKUP_PREFIX = "backups/";
const BACKUP_RETENTION_COUNT = 14; // ~2 weeks of nightly snapshots

export async function runAutomatedBackup(): Promise<{ pathname: string; bytes: number; prunedCount: number }> {
  const backup = await buildFullBackup();
  const gzipped = gzipSync(Buffer.from(JSON.stringify(backup)));
  const stamp = backup.generatedAt.replace(/[:.]/g, "-");

  const blob = await put(`${BACKUP_PREFIX}steadwell-${stamp}.json.gz`, gzipped, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/gzip",
  });

  const prunedCount = await pruneOldBackups();

  return { pathname: blob.pathname, bytes: gzipped.byteLength, prunedCount };
}

// Keeps the Blob store from growing forever — after each new snapshot,
// deletes everything past the most recent BACKUP_RETENTION_COUNT. Sorted by
// uploadedAt (not filename) so this is correct even if a backup is ever
// added out of band.
async function pruneOldBackups(): Promise<number> {
  const { blobs } = await list({ prefix: BACKUP_PREFIX, limit: 1000 });
  const sorted = [...blobs].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const stale = sorted.slice(BACKUP_RETENTION_COUNT);
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
  }
  return stale.length;
}
