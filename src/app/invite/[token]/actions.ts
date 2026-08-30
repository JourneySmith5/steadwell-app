"use server";

import { redirect } from "next/navigation";
import { findInvitationByToken, markInvitationUsed } from "@/lib/repo/invitations";
import { findClientById, linkClientToUser } from "@/lib/repo/clients";
import { createUser, findUserByEmail, markEmailVerified } from "@/lib/repo/users";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { setClientStatus } from "@/lib/status";
import { getSession } from "@/lib/session";

export type SetPasswordState = { message?: string; errors?: string[] } | undefined;

export async function acceptInvitation(
  token: string,
  _state: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const invitation = await findInvitationByToken(token);
  if (!invitation || invitation.usedAt || new Date(invitation.expiresAt) < new Date()) {
    return { message: "This invitation link is invalid or has expired. Ask Coach to resend it." };
  }

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  const errors = validatePasswordPolicy(password);
  if (password !== confirm) errors.push("Passwords must match.");
  if (errors.length > 0) return { errors };

  const client = await findClientById(invitation.clientId);
  if (!client) return { message: "Client record not found." };

  if (await findUserByEmail(client.email)) {
    return { message: "An account already exists for this email. Try signing in instead." };
  }

  const passwordHash = await hashPassword(password);

  // No separate "verify your email" round-trip here: the client already
  // proved they control this address by receiving and clicking Coach's
  // invitation link (invitations are single-use tokens sent to a specific
  // client's email — see src/lib/repo/invitations.ts). Sending a second
  // verification email and making them click through it again was a
  // needless extra hop (and previously a broken one — this only ever
  // console.log'd the link instead of sending it). Mark verified up front
  // and go straight to 2FA setup instead.
  const user = await createUser({
    email: client.email,
    passwordHash,
    role: "client",
    emailVerifyToken: "invite-link-already-verified-ownership",
    emailVerifyExpiresAt: new Date(0).toISOString(),
  });
  await markEmailVerified(user.id);

  await linkClientToUser(client.id, user.id);
  await markInvitationUsed(invitation.id);
  await setClientStatus(client.id, "account_setup_pending", "Client set account password");

  const session = await getSession();
  session.userId = user.id;
  session.totpVerified = true; // nothing to challenge yet — see dal.ts comment
  await session.save();

  redirect("/portal/account/setup-2fa");
}
