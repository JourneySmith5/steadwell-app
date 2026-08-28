"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { findInvitationByToken, markInvitationUsed } from "@/lib/repo/invitations";
import { findClientById, linkClientToUser } from "@/lib/repo/clients";
import { createUser, findUserByEmail } from "@/lib/repo/users";
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
  const emailVerifyToken = randomBytes(24).toString("hex");
  const emailVerifyExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const user = await createUser({
    email: client.email,
    passwordHash,
    role: "client",
    emailVerifyToken,
    emailVerifyExpiresAt,
  });

  await linkClientToUser(client.id, user.id);
  await markInvitationUsed(invitation.id);
  await setClientStatus(client.id, "account_setup_pending", "Client set account password");

  // Dev stand-in for a real transactional email send — see README.
  const verifyUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email/${emailVerifyToken}`;
  console.log(`[email:verify] to ${user.email} — ${verifyUrl}`);

  const session = await getSession();
  session.userId = user.id;
  session.totpVerified = true; // nothing to challenge yet — see dal.ts comment
  await session.save();

  redirect("/verify-email/pending");
}
