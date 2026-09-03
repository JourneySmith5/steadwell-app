"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById, isLockedOut, recordFailedLogin, clearFailedLogins } from "@/lib/repo/users";
import { verifyTotpToken } from "@/lib/totp";
import { isCoachSideRole } from "@/lib/enums";

export type VerifyState = { message?: string } | undefined;

function minutesUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}

export async function verifyTotpLogin(_state: VerifyState, formData: FormData): Promise<VerifyState> {
  const session = await getSession();
  if (!session.pendingUserId) {
    redirect("/login");
  }
  const user = await findUserById(session.pendingUserId!);
  if (!user || !user.totpSecret) {
    redirect("/login");
  }

  // Same account-lockout guard as the password step (§2 Security) — a
  // stolen/leaked password shouldn't turn into unlimited TOTP guesses.
  if (isLockedOut(user!)) {
    session.pendingUserId = undefined;
    await session.save();
    return { message: `Too many failed attempts. Try again in about ${minutesUntil(user!.lockedUntil!)} minute(s).` };
  }

  const token = String(formData.get("token") || "").trim();
  if (!verifyTotpToken(user!.email, user!.totpSecret!, token)) {
    const result = await recordFailedLogin(user!.id);
    if (result.locked) {
      session.pendingUserId = undefined;
      await session.save();
      return {
        message: `Too many failed attempts. This account is locked for about ${minutesUntil(result.lockedUntil!)} minute(s).`,
      };
    }
    return { message: "Invalid code. Try again." };
  }
  await clearFailedLogins(user!.id);

  session.userId = user!.id;
  session.totpVerified = true;
  session.pendingUserId = undefined;
  await session.save();
  redirect(isCoachSideRole(user!.role) ? "/coach" : "/portal");
}
