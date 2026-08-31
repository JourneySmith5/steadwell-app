import "server-only";
import { Resend } from "resend";
import { createEmailDraft as createEmailDraftRow, markEmailSent } from "@/lib/repo/emails";
import { findClientById } from "@/lib/repo/clients";

// §21 Coach-Reviewed Communications: every system-generated email is a draft
// Coach reviews and edits before it goes out — never auto-sent (except the
// two exceptions noted on sendSystemEmail below).
//
// Real delivery via Resend — mirrors src/lib/stripe.ts's fallback pattern:
// getResend() returns null until RESEND_API_KEY is set, and every "send"
// below falls back to a console.log stand-in when it's unconfigured, so
// this runs the same whether or not a real provider is wired up yet.

let cachedResend: Resend | null | undefined;

function getResend(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  cachedResend = key ? new Resend(key) : null;
  return cachedResend;
}

async function deliver(to: string, subject: string, body: string, logTag: string) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || "steadwell@boldlybuilt.group";
  if (!resend) {
    console.log(`[${logTag}] to ${to} — "${subject}"`);
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, text: body });
  if (error) {
    // A failed real send shouldn't be silently swallowed — the caller
    // (a Server Action, or the offboarding sweep) already handles a thrown
    // error the same way any other unexpected failure is handled. It also
    // shouldn't crash the whole request without a clear signal of what
    // actually failed, so this is deliberately explicit rather than a bare
    // rethrow of Resend's own error shape.
    throw new Error(`Resend failed to send "${subject}" to ${to}: ${error.name} — ${error.message}`);
  }
}

export async function createEmailDraft(params: {
  clientId: string;
  template: string;
  subject: string;
  body: string;
}) {
  return createEmailDraftRow(params);
}

export async function sendEmailDraft(emailId: string, editedSubject: string, editedBody: string) {
  const email = await markEmailSent(emailId, editedSubject, editedBody);
  const client = await findClientById(email.clientId);
  if (client) await deliver(client.email, email.subject, email.body, "email:sent");
  return email;
}

// §21 draws a specific line: "Automation prepares communications; Coach
// retains final control over sending" applies to the two application-
// decision emails only — "everything else already in this document
// (account invitations §2, offboarding §16, statement/meeting reminders
// §18) sends automatically without a review step." This is that path —
// used only for the weekly Offboarding reminder/final-notice emails
// (src/lib/offboarding.ts), which create-and-send in one step rather than
// waiting in the coach's email queue for a Send click.
export async function sendSystemEmail(params: { clientId: string; template: string; subject: string; body: string }) {
  const draft = await createEmailDraft(params);
  const email = await markEmailSent(draft.id, params.subject, params.body);
  const client = await findClientById(email.clientId);
  if (client) await deliver(client.email, email.subject, email.body, "email:sent:system");
  return email;
}

export function applicationApprovedTemplate(fullName: string, agreementUrl: string) {
  return {
    subject: "You're approved — next step: agreement & payment",
    body: `Hi ${fullName},\n\nThanks for applying to Steadwell — I've reviewed your application and I think we're a good fit. The next step is reviewing and accepting the engagement agreement, then completing the one-time Financial Foundation payment ($399) to get started.\n\n${agreementUrl}\n\nLooking forward to working with you.\n\n— Coach`,
  };
}

export function applicationDeclinedTemplate(fullName: string) {
  return {
    subject: "Following up on your Steadwell application",
    body: `Hi ${fullName},\n\nThank you for taking the time to apply. After reviewing your application, I don't think I'm the right fit to help right now.\n\nI wish you the best in finding the right support.\n\n— Coach`,
  };
}

// §8/§11 — sent the moment presentPlan() moves the plan to "active" (Coach
// clicked "Present Plan to Client"). Falls into the auto-send bucket (see
// §21 note above sendSystemEmail) alongside meeting reminders, not the
// coach-drafted application-decision emails.
export function planActivatedTemplate(fullName: string, bookingUrl: string | null) {
  const nextStep = bookingUrl
    ? `Book your Foundation Review Meeting here:\n\n${bookingUrl}`
    : `Reach out to schedule your Foundation Review Meeting — we'll go through it together.`;
  return {
    subject: "Your Steadwell plan is ready — let's schedule your Foundation Review Meeting",
    body: `Hi ${fullName},\n\nYour Financial Foundation Plan is finished and ready to view in your Steadwell portal.\n\nThe next step is your Foundation Review Meeting, where we'll walk through the plan together and make sure it fits your life. ${nextStep}\n\n— Coach`,
  };
}

export function accountInvitationTemplate(fullName: string, inviteUrl: string) {
  return {
    subject: "Set up your Steadwell account",
    body: `Hi ${fullName},\n\nYour payment was received — welcome to Steadwell. Use the link below to create your account password and secure your account with two-factor authentication.\n\n${inviteUrl}\n\nThis link expires in 7 days.\n\n— Coach`,
  };
}

// §16 weekly reminder — "sent every week until the client exports or day 30
// arrives, whichever comes first."
export function offboardingReminderTemplate(fullName: string, daysRemaining: number, deletionDate: string, exportUrl: string) {
  return {
    subject: "Reminder: export your Steadwell records",
    body: `Hi ${fullName},\n\nYour Steadwell engagement has ended. You have ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left — until ${deletionDate} — to export your Financial Foundation Plan and records before they're permanently deleted.\n\n${exportUrl}\n\nIf you've already exported, you can ignore this — these reminders stop automatically once we see a completed export.\n\n— Steadwell`,
  };
}

// §16 final notice — "a heavier-weight variant roughly one week before
// deletion, making clear the deletion is permanent and irreversible."
export function offboardingFinalNoticeTemplate(fullName: string, daysRemaining: number, deletionDate: string, exportUrl: string) {
  return {
    subject: "Final notice: your Steadwell records will be permanently deleted soon",
    body: `Hi ${fullName},\n\nThis is a final notice — you have ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left before your Financial Foundation Plan and records are permanently and irreversibly deleted from Steadwell, on ${deletionDate}.\n\nIf you'd like a copy, export now:\n\n${exportUrl}\n\nAfter ${deletionDate}, this data cannot be recovered.\n\n— Steadwell`,
  };
}
