"use server";

import { redirect } from "next/navigation";
import { findUserByPasswordResetToken, resetPassword } from "@/lib/repo/users";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

export type ResetPasswordState = { message?: string; errors?: string[] } | undefined;

export async function completePasswordReset(
  token: string,
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const user = await findUserByPasswordResetToken(token);
  if (!user || !user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt) < new Date()) {
    return { message: "This reset link is invalid or has expired. Request a new one." };
  }

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  const errors = validatePasswordPolicy(password);
  if (password !== confirm) errors.push("Passwords must match.");
  if (errors.length > 0) return { errors };

  const passwordHash = await hashPassword(password);
  await resetPassword(user.id, passwordHash);

  // Not into a session — same reasoning as requiring a fresh sign-in after
  // any password change: whoever clicked this link should prove the new
  // password works, not be dropped straight into the account on the
  // strength of the (now-spent) email link alone.
  redirect("/login?reset=success");
}
