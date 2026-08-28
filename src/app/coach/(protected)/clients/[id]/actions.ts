"use server";

import { redirect } from "next/navigation";
import { findClientById } from "@/lib/repo/clients";
import { resendInvitation as resendInvitationRow } from "@/lib/repo/invitations";
import { createCheckoutLink, bumpResendCount } from "@/lib/repo/checkoutLinks";
import { setClientStatus } from "@/lib/status";
import {
  createEmailDraft,
  applicationApprovedTemplate,
  applicationDeclinedTemplate,
  accountInvitationTemplate,
} from "@/lib/email";
import { requireCoach } from "@/lib/dal";

export async function approveClient(clientId: string) {
  await requireCoach();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  await setClientStatus(clientId, "approved", "Coach approved application");

  const link = await createCheckoutLink(clientId);
  const agreementUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/agreement/${link.token}`;
  const { subject, body } = applicationApprovedTemplate(client.fullName, agreementUrl);
  const email = await createEmailDraft({ clientId, template: "application_approved", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

export async function declineClient(clientId: string) {
  await requireCoach();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  await setClientStatus(clientId, "declined", "Coach declined application");
  const { subject, body } = applicationDeclinedTemplate(client.fullName);
  const email = await createEmailDraft({ clientId, template: "application_declined", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

// Re-sends the agreement + checkout link — same link, just bumps a resend
// counter (the link itself doesn't expire or rotate; see
// src/lib/repo/checkoutLinks.ts for why).
export async function resendAgreementEmail(clientId: string) {
  await requireCoach();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  const link = await createCheckoutLink(clientId);
  await bumpResendCount(clientId);
  const agreementUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/agreement/${link.token}`;
  const { subject, body } = applicationApprovedTemplate(client.fullName, agreementUrl);
  const email = await createEmailDraft({ clientId, template: "application_approved", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

export async function resendInvitationEmail(clientId: string) {
  await requireCoach();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  const invitation = await resendInvitationRow(clientId);
  const inviteUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${invitation.token}`;
  const { subject, body } = accountInvitationTemplate(client.fullName, inviteUrl);
  const email = await createEmailDraft({ clientId, template: "account_invitation", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}
