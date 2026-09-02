"use server";

import { randomBytes } from "node:crypto";
import { findUserByEmail, setPasswordResetToken } from "@/lib/repo/users";
import { sendPasswordResetEmail, passwordResetTemplate, RESEND_CONFIGURED } from "@/lib/email";

export type ForgotPasswordState = { submitted: true; devResetUrl?: string } | { message: string } | undefined;

// §2 forgot-password — reset links are time-limited (1 hour, tighter than
// the 7-day invitation link, since this one guards an existing account
// rather than onboarding a new one) and single-use (setPasswordResetToken
// overwrites/invalidates any earlier one).
export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { message: "Enter your email address." };

  const user = await findUserByEmail(email);

  // Always the same response whether or not an account exists for this
  // email — a different message ("no account found") would let this page
  // be used to check who has a Steadwell login, which a password-recovery
  // form on a financial app shouldn't leak.
  if (!user) return { submitted: true };

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await setPasswordResetToken(user.id, token, expiresAt);

  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  const { subject, body } = passwordResetTemplate(resetUrl);
  await sendPasswordResetEmail(user.email, subject, body);

  // Dev convenience, same idea as verify-email/pending's "Verify now" link —
  // nothing actually emails this link without a real RESEND_API_KEY, so
  // surface it directly rather than making local testing dig through a
  // server console.log.
  return { submitted: true, devResetUrl: RESEND_CONFIGURED ? undefined : resetUrl };
}
