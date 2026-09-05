import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { getPageViewSummary } from "@/lib/repo/pageViews";
import { Card, PageHeader } from "@/components/ui";

const WINDOW_OPTIONS = [7, 30, 90] as const;

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

const AREA_LABELS: Record<string, string> = {
  client_portal: "Client Portal",
  coach_side: "Coach / Owner",
};

export default async function AnalyticsPage(props: PageProps<"/coach/analytics">) {
  await requireOwner();
  const { days: daysParam } = await props.searchParams;
  const days = WINDOW_OPTIONS.includes(Number(daysParam) as (typeof WINDOW_OPTIONS)[number])
    ? Number(daysParam)
    : 30;

  const summary = await getPageViewSummary(days);
  const bounceRate = summary.sessionCount > 0 ? Math.round((summary.singleViewSessions / summary.sessionCount) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Usage Analytics"
        subtitle="Owner-only — internal usage tracking, per the Privacy Policy §1.2/§2(7). No third-party analytics service is used; nothing here is tied to a specific client or user."
      />

      <div className="flex gap-2 mb-6">
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w}
            href={`/coach/analytics?days=${w}`}
            className={`text-sm px-3 py-1 rounded-full border ${
              w === days ? "bg-brand-dark text-white border-brand-dark" : "border-brand-pale text-brand-slate hover:bg-brand-cream"
            }`}
          >
            Last {w} days
          </Link>
        ))}
      </div>

      <Card className="mb-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Page Views" value={String(summary.totalViews)} />
          <Stat label="Sessions" value={String(summary.sessionCount)} />
          <Stat label="Avg. Session Duration" value={formatDuration(summary.avgSessionDurationSeconds)} />
          <Stat label="Single-Page Sessions" value={`${bounceRate}%`} />
        </dl>
        <p className="text-xs text-brand-slate/60 mt-4">
          A &quot;session&quot; groups page views that shared the same login (not decrypted or otherwise
          identified — see schema.sql&apos;s page_views comment). Session duration is only computed across
          sessions with more than one page view.
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Views by Area</h2>
          {summary.areaBreakdown.length === 0 ? (
            <p className="text-sm text-brand-slate/70">No page views recorded in this window yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.areaBreakdown.map((row) => (
                <li key={row.area} className="flex justify-between">
                  <span className="text-brand-slate">{AREA_LABELS[row.area] ?? row.area}</span>
                  <span className="font-medium text-brand-dark">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-heading text-lg text-brand-dark mb-3">Most Visited Pages (Features Used)</h2>
          {summary.topPaths.length === 0 ? (
            <p className="text-sm text-brand-slate/70">No page views recorded in this window yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.topPaths.map((row) => (
                <li key={row.path} className="flex justify-between gap-4">
                  <span className="text-brand-slate truncate">{row.path}</span>
                  <span className="font-medium text-brand-dark shrink-0">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-slate/60 uppercase tracking-wide">{label}</dt>
      <dd className="font-medium text-lg text-brand-dark">{value}</dd>
    </div>
  );
}
