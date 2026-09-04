"use server";

import { redirect } from "next/navigation";
import { findCoachInvitationByToken, markCoachInvitationUsed } from "@/lib/repo/coachInvitations";
import { createUser, findUserByEmail, markEmailVerified } from "@/lib/repo/users";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { getSession } from "@/lib/session";

export type SetPasswordState = { message?: string; errors?: string[] } | undefined;

export async function acceptCoachInvitation(
  token: string,
  _state: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const invitation = await findCoachInvitationByToken(token);
  if (!invitation || invitation.usedAt || new Date(invitation.expiresAt) < new Date()) {
    return { message: "This invitation link is invalid or has expired. Ask the owner to resend it." };
  }

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  const errors = validatePasswordPolicy(password);
  if (password !== confirm) errors.push("Passwords must match.");
  if (errors.length > 0) return { errors };

  if (await findUserByEmail(invitation.email)) {
    return { message: "An account already exists for this email. Try signing in instead." };
  }

  const passwordHash = await hashPassword(password);

  // Same reasoning as the client invite flow (src/app/invite/[token]/actions.ts):
  // the coach already proved control of this address by receiving and
  // clicking a single-use invitation link, so there's no separate
  // "verify your email" round-trip — mark verified up front and go
  // straight to 2FA setup.
  const user = await createUser({
    email: invitation.email,
    fullName: invitation.fullName,
    commissionPercent: invitation.commissionPercent,
    passwordHash,
    role: "coach",
    emailVerifyToken: "invite-link-already-verified-ownership",
    emailVerifyExpiresAt: new Date(0).toISOString(),
  });
  await markEmailVerified(user.id);

  await markCoachInvitationUsed(invitation.id);

  const session = await getSession();
  session.userId = user.id;
  session.totpVerified = true; // nothing to challenge yet — see dal.ts comment
  await session.save();

  redirect("/coach/account/setup-2fa");
}
