import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

// Single source of truth for section order — used both by the Financial
// Foundation overview page (src/app/portal/(protected)/foundation/page.tsx)
// to build its list, and by SectionFooterNav below to know what "next"
// means from any given section. Keep these two in sync if a section is
// ever added, renamed, or reordered.
export const FOUNDATION_SECTIONS: { href: string; label: string }[] = [
  { href: "household", label: "Household" },
  { href: "income", label: "Income" },
  { href: "accounts", label: "Accounts" },
  { href: "statements", label: "Statements" },
  { href: "bills", label: "Regular Bills" },
  { href: "debts", label: "Debt" },
  { href: "emergency-fund", label: "Emergency Fund" },
  { href: "savings", label: "Savings" },
  { href: "sinking-funds", label: "Sinking Funds" },
  { href: "goals", label: "Financial Goals" },
];

// Bottom-of-page "keep going" nav for each Financial Foundation section —
// without this, the only way through the intake was clicking back to the
// overview list after every single section, which real clients found
// confusing (there's no natural "next" affordance otherwise).
export function SectionFooterNav({ currentHref }: { currentHref: string }) {
  const index = FOUNDATION_SECTIONS.findIndex((s) => s.href === currentHref);
  const next = index >= 0 ? FOUNDATION_SECTIONS[index + 1] : undefined;

  return (
    <div className="mt-6 pt-4 border-t border-brand-pale flex items-center justify-between">
      <Link href="/portal/foundation" className="text-sm text-brand-slate hover:underline">
        ← Financial Foundation overview
      </Link>
      {next && (
        <Link href={`/portal/foundation/${next.href}`}>
          <Button type="button" variant="secondary">
            Continue: {next.label} →
          </Button>
        </Link>
      )}
    </div>
  );
}

export function SectionHeader({ label, locked }: { label: string; locked: boolean }) {
  return (
    <div className="mb-6">
      <Link href="/portal/foundation" className="text-sm text-brand-slate hover:underline">
        ← Financial Foundation
      </Link>
      <h1 className="font-heading text-2xl font-semibold text-brand-dark mt-1">{label}</h1>
      {locked && (
        <p className="mt-2 text-sm bg-brand-pale text-brand-dark rounded-md px-3 py-2 inline-block">
          Submitted — read-only. Use &quot;Request an Update&quot; from the Financial Foundation page to make
          changes.
        </p>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-brand-slate/70 italic mb-4">{children}</p>;
}
