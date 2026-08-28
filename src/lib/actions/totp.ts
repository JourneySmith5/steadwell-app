"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/repo/users";
import { enableTotp } from "@/lib/repo/users";
import { verifyTotpToken } from "@/lib/totp";
import { findClientByUserId } from "@/lib/repo/clients";
import { setClientStatus } from "@/lib/status";

export type TotpConfirmState = { message?: string } | undefined;

// Bound with a redirect target from each role's setup page:
// action={confirmTotpSetup.bind(null, "/portal")}
export async function confirmTotpSetup(
  redirectTo: string,
  _state: TotpConfirmState,
  formData: FormData
): Promise<TotpConfirmState> {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  const user = await findUserById(session.userId!);
  if (!user || !user.totpSecret) redirect("/login");

  const token = String(formData.get("token") || "").trim();
  if (!verifyTotpToken(user!.email, user!.totpSecret!, token)) {
    return { message: "Invalid code. Try again." };
  }

  await enableTotp(user!.id);

  // Account stage (§1) is complete once email is verified and 2FA is on —
  // advance the pipeline into Foundation Intake.
  if (user!.role === "client") {
    const client = await findClientByUserId(user!.id);
    if (client && client.status === "account_setup_pending") {
      await setClientStatus(client.id, "foundation_intake", "Account setup complete (email verified + 2FA enabled)");
    }
  }

  redirect(redirectTo);
}
