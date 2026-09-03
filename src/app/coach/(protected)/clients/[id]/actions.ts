"use server";

import { redirect } from "next/navigation";
import { findClientById, setClientCoach } from "@/lib/repo/clients";
import { resendInvitation as resendInvitationRow } from "@/lib/repo/invitations";
import { createCheckoutLink, bumpResendCount } from "@/lib/repo/checkoutLinks";
import { setClientStatus } from "@/lib/status";
import { deleteClientImmediately } from "@/lib/offboarding";
import {
  createEmailDraft,
  applicationApprovedTemplate,
  applicationDeclinedTemplate,
  accountInvitationTemplate,
} from "@/lib/email";
import { requireClientAccess, requireOwner } from "@/lib/dal";

export async function approveClient(clientId: string) {
  const { client } = await requireClientAccess(clientId);

  await setClientStatus(clientId, "approved", "Coach approved application");

  const link = await createCheckoutLink(clientId);
  const agreementUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/agreement/${link.token}`;
  const { subject, body } = applicationApprovedTemplate(client.fullName, agreementUrl);
  const email = await createEmailDraft({ clientId, template: "application_approved", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

export async function declineClient(clientId: string) {
  const { client } = await requireClientAccess(clientId);

  await setClientStatus(clientId, "declined", "Coach declined application");
  const { subject, body } = applicationDeclinedTemplate(client.fullName);
  const email = await createEmailDraft({ clientId, template: "application_declined", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

// Re-sends the agreement + checkout link — same link, just bumps a resend
// counter (the link itself doesn't expire or rotate; see
// src/lib/repo/checkoutLinks.ts for why).
export async function resendAgreementEmail(clientId: string) {
  const { client } = await requireClientAccess(clientId);

  const link = await createCheckoutLink(clientId);
  await bumpResendCount(clientId);
  const agreementUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/agreement/${link.token}`;
  const { subject, body } = applicationApprovedTemplate(client.fullName, agreementUrl);
  const email = await createEmailDraft({ clientId, template: "application_approved", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

export async function resendInvitationEmail(clientId: string) {
  const { client } = await requireClientAccess(clientId);

  const invitation = await resendInvitationRow(clientId);
  const inviteUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${invitation.token}`;
  const { subject, body } = accountInvitationTemplate(client.fullName, inviteUrl);
  const email = await createEmailDraft({ clientId, template: "account_invitation", subject, body });
  redirect(`/coach/clients/${clientId}/email/${email.id}`);
}

// Owner-only regardless of assignment — deliberately requireOwner(), not
// requireClientAccess(), since a coach shouldn't be able to permanently
// delete even their own assigned client. The DeleteClientForm client
// component already disables the button until the typed text matches —
// this is the server-side re-check that actually gates the irreversible
// part, since client-side validation alone is just a UI courtesy, never
// something to trust for something this permanent.
export async function deleteClientForever(clientId: string, formData: FormData) {
  await requireOwner();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  const typed = String(formData.get("confirmName") ?? "").trim().toLowerCase();
  if (typed !== client.fullName.trim().toLowerCase()) {
    redirect(`/coach/clients/${clientId}?deleteMismatch=1`);
  }

  await deleteClientImmediately(clientId, "Deleted immediately by Coach via client detail page");
  redirect(`/coach/clients?deleted=1`);
}

// Owner-only — reassigns which coach a client belongs to (or unassigns,
// if coachId is empty). See the Coach card on the client detail page.
export async function reassignClientCoach(clientId: string, formData: FormData) {
  await requireOwner();
  const raw = String(formData.get("coachId") ?? "").trim();
  await setClientCoach(clientId, raw === "" ? null : raw);
  redirect(`/coach/clients/${clientId}`);
}
