"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { findUserByEmail, setDefaultCoach, setUserFullName } from "@/lib/repo/users";
import {
  createCoachInvitation,
  findCoachInvitationByEmail,
  findCoachInvitationById,
  resendCoachInvitation,
} from "@/lib/repo/coachInvitations";
import { sendDirectEmail, coachInvitationTemplate } from "@/lib/email";
import { parseText } from "@/lib/formHelpers";

const PATH = "/coach/team";

function fail(message: string): never {
  redirect(PATH + "?error=" + encodeURIComponent(message));
}

const inviteSchema = z.object({
  fullName: z.string().min(2, "Enter the coach's full name."),
  email: z.email("Enter a valid email."),
});

async function sendInviteEmail(email: string, fullName: string, token: string) {
  const inviteUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/coach/${token}`;
  const { subject, body } = coachInvitationTemplate(fullName, inviteUrl);
  await sendDirectEmail(email, subject, body, "email:sent:coach-invitation");
}

// Owner enters a name + email, we email a secure self-service invite link —
// the coach sets their own password and 2FA, mirroring the client invite
// flow (src/app/invite/[token]/actions.ts). The owner never sees or sets
// the coach's password.
export async function inviteCoach(formData: FormData) {
  await requireOwner();

  const parsed = inviteSchema.safeParse({
    fullName: parseText(formData, "fullName", { maxLength: 200 }),
    email: parseText(formData, "email", { maxLength: 200 }),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const { fullName, email } = parsed.data;

  if (await findUserByEmail(email)) {
    fail(`${email} already has an account.`);
  }

  const existingInvite = await findCoachInvitationByEmail(email);
  if (existingInvite && !existingInvite.usedAt) {
    // Already a pending invite for this address — resend rather than
    // erroring, since coach_invitations.email is UNIQUE and a second
    // createCoachInvitation call would just fail on that constraint.
    const invitation = await resendCoachInvitation(existingInvite.id);
    await sendInviteEmail(invitation.email, invitation.fullName, invitation.token);
    redirect(PATH);
  }

  const invitation = await createCoachInvitation(email, fullName);
  await sendInviteEmail(invitation.email, invitation.fullName, invitation.token);
  redirect(PATH);
}

export async function resendCoachInviteAction(invitationId: string) {
  await requireOwner();
  const existing = await findCoachInvitationById(invitationId);
  if (!existing || existing.usedAt) fail("That invitation is no longer pending.");
  const invitation = await resendCoachInvitation(invitationId);
  await sendInviteEmail(invitation.email, invitation.fullName, invitation.token);
  redirect(PATH);
}

export async function setDefaultCoachAction(userId: string) {
  await requireOwner();
  await setDefaultCoach(userId);
  redirect(PATH);
}

// Inline "Name" edit on each roster row — covers the owner account (never
// collected a name at signup) and lets Journey correct a coach's name if
// needed. A new coach invite populates this automatically on accept
// (acceptCoachInvitation, src/app/invite/coach/[token]/actions.ts); this
// is the manual path for everyone else.
export async function updateUserNameAction(userId: string, formData: FormData) {
  await requireOwner();
  const fullName = parseText(formData, "fullName", { maxLength: 200 });
  if (!fullName) fail("Enter a name.");
  await setUserFullName(userId, fullName);
  redirect(PATH);
}
