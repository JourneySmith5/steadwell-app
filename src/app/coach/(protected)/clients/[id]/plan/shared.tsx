import Link from "next/link";
import { PLAN_STATUS_LABELS } from "@/lib/enums";
import type { ClientRow } from "@/lib/repo/clients";

const STAGES: { href: string; label: string }[] = [
  { href: "", label: "Baseline" },
  { href: "/allocation", label: "Cash-Flow Allocation" },
  { href: "/debts", label: "Debt Strategy" },
  { href: "/goals", label: "Savings & Goals" },
  { href: "/stress-test", label: "Stress Test" },
  { href: "/finalize", label: "Finalize" },
];

export function PlanBuilderHeader({ client, current }: { client: ClientRow; current: string }) {
  const base = `/coach/clients/${client.id}/plan`;
  return (
    <div className="mb-6">
      <Link href={`/coach/clients/${client.id}`} className="text-sm text-brand-slate hover:underline">
        ← {client.fullName}
      </Link>
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">Plan Builder</h1>
        <span className="inline-block rounded-full bg-brand-pale text-brand-dark text-xs font-medium px-3 py-1">
          {PLAN_STATUS_LABELS[client.planStatus]}
        </span>
      </div>
      <nav className="flex flex-wrap gap-1 mt-4 border-b border-brand-pale">
        {STAGES.map((s) => {
          const active = s.href === current;
          return (
            <Link
              key={s.href}
              href={`${base}${s.href}`}
              className={`px-3 py-2 text-sm rounded-t-md ${
                active ? "bg-white border border-b-0 border-brand-pale text-brand-dark font-medium" : "text-brand-slate hover:text-brand-dark"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
