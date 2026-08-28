import { Pool, type PoolClient } from "pg";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

// Production database adapter, built on real Postgres via the `pg` driver.
// This replaced an earlier node:sqlite-based adapter used for local dev —
// see git history / README "Going to production" for that version if you
// need it for reference. Every repo/*.ts file's run/get/all calls, and the
// named-parameter SQL text they write ($id, $clientId, etc.), are unchanged
// by this migration — only this file, plus the small number of places that
// used SQLite-specific transaction/db-introspection APIs directly
// (src/lib/repo/deletion.ts, src/lib/backup.ts), needed to change.

const globalForDb = globalThis as unknown as { __steadwellPool?: Pool; __steadwellSchemaReady?: Promise<void> };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Point it at a real Postgres connection string (see README 'Before this goes live')."
  );
}

export const pool: Pool = globalForDb.__steadwellPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__steadwellPool = pool;
}

// Runs schema.sql (idempotent — every statement is CREATE ... IF NOT EXISTS)
// once per process. Every exported query function awaits this first so
// nothing can query before the schema exists, without every caller needing
// to remember to do so.
function initSchema(): Promise<void> {
  if (!globalForDb.__steadwellSchemaReady) {
    globalForDb.__steadwellSchemaReady = (async () => {
      const schema = fs.readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf-8");
      await pool.query(schema);
    })();
  }
  return globalForDb.__steadwellSchemaReady;
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Lets a transaction (see withTransaction below) route every run/get/all
// call made inside its callback through the one checked-out client that
// holds the BEGIN, instead of the shared pool (which could otherwise hand
// out a different connection per query and silently split the transaction).
const txStorage = new AsyncLocalStorage<PoolClient>();

// This app's SQL is written throughout src/lib/repo/* with SQLite-style
// named placeholders ($id, $clientId, ...) and a matching { $id: ... }
// params object — that convention didn't need to change when the driver
// underneath it did. This rewrites named placeholders to Postgres's
// positional $1/$2/... form and builds the matching positional values array,
// so no call site anywhere else in the app needed to change.
function toPositional(sql: string, params: Record<string, unknown>): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const indexByName = new Map<string, number>();
  const text = sql.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
    const key = `$${name}`;
    let idx = indexByName.get(key);
    if (idx === undefined) {
      values.push(params[key]);
      idx = values.length;
      indexByName.set(key, idx);
    }
    return `$${idx}`;
  });
  return { text, values };
}

async function query(sql: string, params: Record<string, unknown>) {
  await initSchema();
  const { text, values } = toPositional(sql, params);
  const client = txStorage.getStore() ?? pool;
  return client.query(text, values);
}

export async function run(sql: string, params: Record<string, unknown> = {}): Promise<void> {
  await query(sql, params);
}

export async function get<T = unknown>(sql: string, params: Record<string, unknown> = {}): Promise<T | undefined> {
  const result = await query(sql, params);
  return result.rows[0] as T | undefined;
}

export async function all<T = unknown>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const result = await query(sql, params);
  return result.rows as T[];
}

// Real multi-statement transaction — checks out a single connection, runs
// BEGIN, hands control to fn (during which every run/get/all call anywhere
// in the call stack transparently uses this same connection via
// AsyncLocalStorage, not the pool), then COMMITs or ROLLBACKs. Used by
// src/lib/repo/deletion.ts's hardDeleteClient so a failure partway through
// can't leave a client half-deleted.
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await initSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await txStorage.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
