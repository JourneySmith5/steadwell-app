import Link from "next/link";
import type { ReactNode } from "react";

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
