import { run, get, all, newId, nowIso } from "@/lib/db/client";

// See schema.sql's page_views comment for the privacy reasoning (anonymous,
// aggregate-only, no new cookie, correlated by a one-way hash of the
// existing session cookie rather than by user/client identity).
export type PageViewArea = "client_portal" | "coach_side";

export async function recordPageView(params: {
  sessionHash: string;
  area: PageViewArea;
  path: string;
  referrer?: string | null;
}): Promise<void> {
  await run(
    `INSERT INTO page_views (id, session_hash, area, path, referrer, created_at) VALUES ($id, $sessionHash, $area, $path, $referrer, $now)`,
    {
      $id: newId(),
      $sessionHash: params.sessionHash,
      $area: params.area,
      $path: params.path,
      $referrer: params.referrer ?? null,
      $now: nowIso(),
    }
  );
}

export interface PageViewSummary {
  totalViews: number;
  sessionCount: number;
  singleViewSessions: number;
  avgSessionDurationSeconds: number | null;
  areaBreakdown: { area: string; views: number }[];
  topPaths: { path: string; views: number }[];
}

// Powers the owner-only /coach/analytics dashboard. `days` is a rolling
// window ending now (e.g. 7, 30) — matches how every other reporting view
// in this app windows its numbers (see src/lib/repo/reports.ts).
export async function getPageViewSummary(days: number): Promise<PageViewSummary> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const totals = await get<{ total_views: string }>(
    `SELECT COUNT(*) AS total_views FROM page_views WHERE created_at >= $cutoff`,
    { $cutoff: cutoff }
  );

  const sessionStats = await get<{ session_count: string; single_view_sessions: string; avg_duration_seconds: string | null }>(
    `WITH session_stats AS (
       SELECT session_hash, COUNT(*) AS views,
              MIN(created_at::timestamptz) AS started_at,
              MAX(created_at::timestamptz) AS ended_at
       FROM page_views
       WHERE created_at >= $cutoff
       GROUP BY session_hash
     )
     SELECT
       COUNT(*) AS session_count,
       COUNT(*) FILTER (WHERE views = 1) AS single_view_sessions,
       AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) FILTER (WHERE views > 1) AS avg_duration_seconds
     FROM session_stats`,
    { $cutoff: cutoff }
  );

  const areaRows = await all<{ area: string; views: string }>(
    `SELECT area, COUNT(*) AS views FROM page_views WHERE created_at >= $cutoff GROUP BY area ORDER BY views DESC`,
    { $cutoff: cutoff }
  );

  const pathRows = await all<{ path: string; views: string }>(
    `SELECT path, COUNT(*) AS views FROM page_views WHERE created_at >= $cutoff GROUP BY path ORDER BY views DESC LIMIT 10`,
    { $cutoff: cutoff }
  );

  return {
    totalViews: Number(totals?.total_views ?? 0),
    sessionCount: Number(sessionStats?.session_count ?? 0),
    singleViewSessions: Number(sessionStats?.single_view_sessions ?? 0),
    avgSessionDurationSeconds: sessionStats?.avg_duration_seconds != null ? Number(sessionStats.avg_duration_seconds) : null,
    areaBreakdown: areaRows.map((r) => ({ area: r.area, views: Number(r.views) })),
    topPaths: pathRows.map((r) => ({ path: r.path, views: Number(r.views) })),
  };
}
