import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { getOrCreatePendingTotpSecret } from "@/lib/totp";
import { TotpSetupForm } from "@/components/TotpSetupForm";

export default async function CoachSetup2FAPage() {
  const user = await requireRole("coach");
  if (user.totpEnabled) redirect("/coach");

  const { secret, qrDataUrl } = await getOrCreatePendingTotpSecret(user.id);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-10">
      <TotpSetupForm qrDataUrl={qrDataUrl} secret={secret} redirectTo="/coach" />
    </main>
  );
}
