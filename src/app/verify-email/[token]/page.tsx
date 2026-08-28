import { findUserByEmailVerifyToken, markEmailVerified } from "@/lib/repo/users";
import { Card, PageHeader, Button } from "@/components/ui";
import Link from "next/link";

export default async function VerifyEmailTokenPage(props: PageProps<"/verify-email/[token]">) {
  const { token } = await props.params;
  const user = await findUserByEmailVerifyToken(token);

  const expired = user?.emailVerifyExpiresAt && new Date(user.emailVerifyExpiresAt) < new Date();

  if (user && !expired) {
    await markEmailVerified(user.id);
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="max-w-sm text-center">
        {user && !expired ? (
          <>
            <PageHeader title="Email Verified" subtitle="Next: set up two-factor authentication." />
            <Link href="/portal/account/setup-2fa">
              <Button>Continue</Button>
            </Link>
          </>
        ) : (
          <PageHeader title="Link Invalid or Expired" subtitle="Sign in and we'll send a fresh link." />
        )}
      </Card>
    </main>
  );
}
