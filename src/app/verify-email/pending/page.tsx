import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { findUserById } from "@/lib/repo/users";
import { Card, PageHeader } from "@/components/ui";

export default async function VerifyEmailPendingPage() {
  const authed = await requireRole("client");
  const user = await findUserById(authed.id);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="max-w-sm text-center">
        <PageHeader title="Check Your Email" subtitle="Click the verification link we sent to confirm your account." />
        {process.env.NODE_ENV !== "production" && user?.emailVerifyToken && (
          <p className="text-xs text-brand-slate/60 mt-4 border-t border-brand-pale pt-4">
            Dev mode — no real email is sent yet.{" "}
            <Link href={`/verify-email/${user.emailVerifyToken}`} className="text-brand-dark underline">
              Verify now
            </Link>
          </p>
        )}
      </Card>
    </main>
  );
}
