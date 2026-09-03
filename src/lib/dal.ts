import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/repo/users";
import { findClientByUserId, findClientById } from "@/lib/repo/clients";
import { isCoachSideRole, type UserRole } from "@/lib/enums";

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

// Bare coach-or-owner check — both sides of the coach app share this; the
// difference between them is what they can SEE and DO once in, not
// whether they're let in the door at all. Used pre-2FA-enforcement (the
// coach layout, the 2FA setup page itself) the same way requireRole is
// for a single exact role.
export async function requireCoachRole() {
  const user = await getCurrentUser();
  if (!user || !isCoachSideRole(user.role)) {
    redirect("/login");
  }
  return user;
}

export async function requireCoach() {
  const user = await requireCoachRole();
  if (!user.totpEnabled) {
    redirect("/coach/account/setup-2fa");
  }
  return user;
}

// Owner-only gate — the Team page, Revenue Reports, and the
// destructive/global-config actions (Delete Client, Backups, Offboarding
// sweep, Discount Codes, Booking Links) a hired coach shouldn't be able to
// reach. Bounces a logged-in-but-not-owner coach back to their own
// dashboard rather than an error page — this is a normal "not for you"
// the same way a nav link they don't have just wouldn't be there.
export async function requireOwner() {
  const user = await requireCoach();
  if (user.role !== "owner") {
    redirect("/coach");
  }
  return user;
}

// The single access check every /coach/clients/[id]/** page and action
// should call instead of requireCoach() + findClientById() separately —
// the owner can reach any client, a coach only one assigned to them.
// Centralizing this means a route that forgets the check fails closed
// (calling this at all is the thing that's easy to forget, not getting
// the scoping logic right once it's called) — notFound() rather than a
// 403 so a coach probing another coach's client ids can't even tell
// whether the id exists.
export async function requireClientAccess(clientId: string) {
  const user = await requireCoach();
  const client = await findClientById(clientId);
  if (!client) notFound();
  if (user.role === "coach" && client.coachId !== user.id) notFound();
  return { user, client };
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
