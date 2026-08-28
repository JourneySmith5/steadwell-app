import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/repo/users";
import { findClientByUserId } from "@/lib/repo/clients";
import type { UserRole } from "@/lib/enums";

// Data Access Layer — every protected page/action should call one of these
// rather than trusting client-side state. See Next.js auth guide: checks
// should happen close to the data, not just in a layout or proxy.
//
// Session shape: session.userId + session.totpVerified together mean
// "password check passed, and either the TOTP challenge was passed, or the
// user has no TOTP enrolled yet" (see login/actions.ts). That lets a
// freshly-invited user reach the 2FA *setup* page without a chicken-and-egg
// lockout, while still requiring the real challenge on every login once
// TOTP is enabled.

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session.userId || !session.totpVerified) return null;
  const user = await findUserById(session.userId);
  if (!user) return null;
  const client = user.role === "client" ? await findClientByUserId(user.id) : undefined;
  return { ...user, client };
});

// Bare role check — used by the 2FA *setup* pages themselves, which must be
// reachable before 2FA is enabled.
export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user || user.role !== role) {
    redirect("/login");
  }
  return user;
}

export async function requireCoach() {
  const user = await requireRole("coach");
  if (!user.totpEnabled) {
    redirect("/coach/account/setup-2fa");
  }
  return user;
}

export async function requireClient() {
  const user = await requireRole("client");
  if (!user.emailVerified) {
    redirect("/verify-email/pending");
  }
  if (!user.totpEnabled) {
    redirect("/portal/account/setup-2fa");
  }
  return user;
}
