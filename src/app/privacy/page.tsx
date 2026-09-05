import Link from "next/link";
import { getPrivacyBlocks } from "@/lib/privacyContent";
import { LegalText } from "@/components/LegalText";

export const metadata = {
  title: "Privacy Policy — Steadwell",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <LegalText title="Privacy Policy" blocks={getPrivacyBlocks()} />
      <p className="text-center text-sm mt-8">
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
