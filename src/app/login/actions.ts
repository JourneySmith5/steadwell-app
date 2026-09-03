"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, isLockedOut, recordFailedLogin, clearFailedLogins } from "@/lib/repo/users";
import { verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/session";
import { isCoachSideRole } from "@/lib/enums";

export type LoginState = { message?: string } | undefined;

function minutesUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const user = await findUserByEmail(email);

  // §2 Security / build order step 14 — account lockout after repeated
  // failed attempts (see the comment in src/lib/repo/users.ts). Checked
  // before touching the password hash so a locked account can't be used to
  // keep guessing.
  if (user && isLockedOut(user)) {
    return { message: `Too many failed attempts. Try again in about ${minutesUntil(user.lockedUntil!)} minute(s).` };
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      const result = await recordFailedLogin(user.id);
      if (result.locked) {
        return {
          message: `Too many failed attempts. This account is locked for about ${minutesUntil(result.lockedUntil!)} minute(s).`,
        };
      }
    }
    return { message: "Invalid email or password." };
  }
  await clearFailedLogins(user.id);
  if (!user.emailVerified && user.role === "client") {
    // Still let them through to the session so /verify-email/pending can guide them —
    // requireClient() will redirect appropriately.
  }

  const session = await getSession();

  if (user.totpEnabled) {
    session.pendingUserId = user.id;
    session.userId = undefined;
    session.totpVerified = false;
    await session.save();
    redirect("/login/verify");
  }

  // No TOTP enrolled yet — let them in so they can be routed to set it up.
  session.userId = user.id;
  session.totpVerified = true;
  session.pendingUserId = undefined;
  await session.save();
  redirect(isCoachSideRole(user.role) ? "/coach" : "/portal");
}
