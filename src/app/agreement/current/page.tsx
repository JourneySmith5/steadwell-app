import Link from "next/link";
import { getAgreementBlocks } from "@/lib/agreementContent";
import { LegalText } from "@/components/LegalText";

// Reference-only view of the current, generic Coaching Agreement text — not
// the per-client acceptance flow at /agreement/[token] (a live checkout
// link tied to one applicant). Exists so an already-enrolled client has
// somewhere to actually read the Agreement they're bound by, the same way
// /privacy and /terms already give a standalone page for those two
// documents — see src/lib/legalNotices.ts, which links here for any
// Agreement-related 30-day notice (Agreement §14.2). A static route
// ("current") takes precedence over the [token] dynamic segment at the
// same level, so this doesn't collide with real checkout links.
export const metadata = {
  title: "Coaching Agreement — Steadwell",
};

export default function CurrentAgreementPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <LegalText title="Financial Coaching Services Agreement" blocks={getAgreementBlocks()} />
      <p className="text-center text-sm mt-8">
        <Link href="/privacy" className="text-brand-dark underline">
          Privacy Policy
        </Link>
        <span className="text-brand-slate/50 mx-2">·</span>
        <Link href="/terms" className="text-brand-dark underline">
          Terms of Service
        </Link>
        <span className="text-brand-slate/50 mx-2">·</span>
        <Link href="/" className="text-brand-dark underline">
          Steadwell Home
        </Link>
      </p>
    </main>
  );
}
