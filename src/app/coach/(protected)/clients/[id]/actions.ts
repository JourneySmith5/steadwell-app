"use server";

import { redirect } from "next/navigation";
import { findClientById, setClientCoach } from "@/lib/repo/clients";
import { resendInvitation as resendInvitationRow } from "@/lib/repo/invitations";
import { createCheckoutLink, bumpResendCount } from "@/lib/repo/checkoutLinks";
import { listPaymentsForClient, markPaymentStatus } from "@/lib/repo/payments";
import { setClientStatus } from "@/lib/status";
import { deleteClientImmediately } from "@/lib/offboarding";
import {
  createEmailDraft,
  applicationApprovedTemplate,
  applicationDeclinedTemplate,
  accountInvitationTemplate,
} from "@/lib/email";
import { requireClientAccess, requireOwner } from "@/lib/dal";
import { getStripe } from "@/lib/stripe";
import { FOUNDATION_REFUND_ELIGIBLE_STATUSES } from "@/lib/enums";

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

// Owner-only, real money movement — issues a real Stripe refund (or the
// test-mode equivalent) for the $399 Financial Foundation fee, per §17's
// post-legal-review policy: refundable any time before Client submits
// their Foundation Intake, non-refundable after. FOUNDATION_REFUND_
// ELIGIBLE_STATUSES (src/lib/enums.ts) is the single source of truth for
// that cutoff — re-checked here server-side (never trust the page's own
// gate, which just hides the button once the status has moved past it).
// The RefundFoundationFeeForm client component's typed-confirmation gate
// is the same UI-courtesy pattern as DeleteClientForm above — friction
// against a misclick, not the actual safety, since real money is moving.
//
// A refund ends the engagement the same way a decline or a client-initiated
// cancellation does: setClientStatus(..., "canceled", ...) both records why
// and — since "canceled" is an OFFBOARDING_TRIGGER_STATUSES entry — starts
// the normal 30-day export/deletion clock automatically (see src/lib/status.ts).
export async function refundFoundationPayment(clientId: string, formData: FormData) {
  await requireOwner();
  const client = await findClientById(clientId);
  if (!client) throw new Error("Client not found");

  const typed = String(formData.get("confirmRefund") ?? "").trim().toUpperCase();
  if (typed !== "REFUND") {
    redirect(`/coach/clients/${clientId}?refundMismatch=1`);
  }

  if (!FOUNDATION_REFUND_ELIGIBLE_STATUSES.includes(client.status)) {
    redirect(`/coach/clients/${clientId}?refundError=${encodeURIComponent("This client has already submitted their Foundation Intake — the fee is no longer refundable.")}`);
  }

  const payments = await listPaymentsForClient(clientId);
  const foundationPayment = payments.find((p) => p.type === "foundation" && p.status === "paid");
  if (!foundationPayment) {
    redirect(`/coach/clients/${clientId}?refundError=${encodeURIComponent("No paid Financial Foundation fee was found to refund.")}`);
  }

  const stripe = getStripe();
  if (stripe && foundationPayment.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: foundationPayment.stripePaymentIntentId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe refund failed.";
      redirect(`/coach/clients/${clientId}?refundError=${encodeURIComponent(message)}`);
    }
  }
  // No live Stripe payment intent (test mode, same fork as everywhere else
  // this app touches Stripe — see src/lib/stripe.ts) — nothing to actually
  // refund through Stripe, just record it as refunded locally below.

  await markPaymentStatus(foundationPayment.id, "refunded");
  await setClientStatus(clientId, "canceled", "Financial Foundation fee refunded before Foundation Intake was submitted");
  redirect(`/coach/clients/${clientId}`);
}

// Owner-only — reassigns which coach a client belongs to (or unassigns,
// if coachId is empty). See the Coach card on the client detail page.
// Any coach-side user can reassign — Journey's ask: a coach should be able
// to hand their own client off to a colleague, not just the owner.
// requireClientAccess already confines a non-owner coach to clients
// actually assigned to them (notFound() otherwise, see dal.ts), so this
// can't be used to move a client that isn't the caller's in the first
// place; there's no additional "target must be a real coach" check beyond
// what the <Select> on the page already offers (every coach-side account,
// including possibly the acting coach themselves — reassigning to
// yourself is a harmless no-op).
export async function reassignClientCoach(clientId: string, formData: FormData) {
  await requireClientAccess(clientId);
  const raw = String(formData.get("coachId") ?? "").trim();
  await setClientCoach(clientId, raw === "" ? null : raw);
  redirect(`/coach/clients/${clientId}`);
}
