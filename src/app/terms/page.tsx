import Link from "next/link";
import { getTermsBlocks } from "@/lib/termsContent";
import { LegalText } from "@/components/LegalText";

export const metadata = {
  title: "Terms of Service — Steadwell",
};

export default function TermsOfServicePage() {
  return (
    <main className="flex-1 px-6 py-10">
      <LegalText title="Terms of Service" blocks={getTermsBlocks()} />
      <p className="text-center text-sm mt-8">
        <Link href="/privacy" className="text-brand-dark underline">
          Privacy Policy
        </Link>
        <span className="text-brand-slate/50 mx-2">·</span>
        <Link href="/" className="text-brand-dark underline">
          Steadwell Home
        </Link>
      </p>
    </main>
  );
}
