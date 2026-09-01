import "server-only";
import { Resend } from "resend";
import { createEmailDraft as createEmailDraftRow, markEmailSent } from "@/lib/repo/emails";
import { findClientById, setFoundationReviewEmailSentAt } from "@/lib/repo/clients";
import { generatePlanPdfBuffer } from "@/lib/planPdf";

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

async function deliver(
  to: string,
  subject: string,
  body: string,
  logTag: string,
  attachments?: { filename: string; content: Buffer }[]
) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || "steadwell@boldlybuilt.group";
  if (!resend) {
    console.log(`[${logTag}] to ${to} — "${subject}"${attachments?.length ? ` (with ${attachments.length} attachment(s))` : ""}`);
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, text: body, attachments });
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
  attachPlanPdf?: boolean;
}) {
  return createEmailDraftRow(params);
}

export async function sendEmailDraft(emailId: string, editedSubject: string, editedBody: string) {
  const email = await markEmailSent(emailId, editedSubject, editedBody);
  const client = await findClientById(email.clientId);
  if (client) {
    // Regenerated fresh from the immutable finalized plan rather than
    // stored anywhere — see generatePlanPdfBuffer's comment. Only clients
    // with an active (finalized) plan ever get this flag set in the first
    // place (see markFoundationReviewCompleteAndEmailPlan), but a plan
    // could in principle no longer be "active" by send time — skip the
    // attachment rather than throw if so; the email itself still sends.
    const attachments =
      email.attachPlanPdf && client.planStatus === "active"
        ? [
            {
              filename: `steadwell-plan-${client.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
              content: await generatePlanPdfBuffer(client),
            },
          ]
        : undefined;
    await deliver(client.email, email.subject, email.body, "email:sent", attachments);

    // Starts THANKYOU15's 24-hour Accountability-signup window — see
    // src/lib/promotions.ts.
    if (email.template === "foundation_review_complete") {
      await setFoundationReviewEmailSentAt(client.id, new Date().toISOString());
    }
  }
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
    body: `Hi ${fullName},\n\nThanks for applying to Steadwell — I've reviewed your application and I think we're a good fit. The next step is reviewing and accepting the engagement agreement, then completing the one-time Financial Foundation payment ($399) to get started.\n\n${agreementUrl}\n\nLooking forward to working with you.\n\n— Steadwell`,
  };
}

export function applicationDeclinedTemplate(fullName: string) {
  return {
    subject: "Following up on your Steadwell application",
    body: `Hi ${fullName},\n\nThank you for taking the time to apply. After reviewing your application, I don't think I'm the right fit to help right now.\n\nI wish you the best in finding the right support.\n\n— Steadwell`,
  };
}

// §8/§11 — sent the moment presentPlan() moves the plan to "active" (Coach
// clicked "Present Plan to Client"). Falls into the auto-send bucket (see
// §21 note above sendSystemEmail) alongside meeting reminders, not the
// coach-drafted application-decision emails.
//
// Two explicit calls to action, not one — Journey's ask: tell the client to
// go review their plan (with a direct link, not just "it's in your
// portal"), and separately tell them to schedule their Plan Review Meeting.
export function planActivatedTemplate(fullName: string, bookingUrl: string | null) {
  const portalUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/portal/plan`;
  const nextStep = bookingUrl
    ? `Book your Plan Review Meeting here:\n\n${bookingUrl}`
    : `Reach out to schedule your Plan Review Meeting — we'll go through it together.`;
  return {
    subject: "Your Steadwell plan is ready — review it and schedule your Plan Review Meeting",
    body: `Hi ${fullName},\n\nYour Financial Foundation Plan is finished. Take a few minutes to review it here:\n\n${portalUrl}\n\nOnce you've had a look, the next step is your Plan Review Meeting, where we'll walk through it together and make sure it fits your life. ${nextStep}\n\n— Steadwell`,
  };
}

// §9 THANKYOU15 trigger — drafted (not auto-sent, matching the review-gate
// every other client-facing content decision goes through) by "Mark
// Complete & Email Plan" on the Coach Meetings page for a Foundation-type
// meeting; see markFoundationReviewCompleteAndEmailPlan. The Accountability
// pitch/link always shows (Journey's ask — this is the natural moment to
// mention ongoing support, discount or not); thankYouPercentOff is null
// when THANKYOU15 isn't currently enabled (Coach Settings → Discount
// Codes), which only drops the discount sentence, not the whole pitch —
// never promises a promotion that isn't live.
export function foundationReviewCompleteTemplate(fullName: string, thankYouPercentOff: number | null) {
  const accountabilityUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/portal/accountability`;
  const incentiveSentence = thankYouPercentOff
    ? ` Sign up within the next 24 hours and you'll automatically get ${thankYouPercentOff}% off your first 3 months.`
    : "";
  return {
    subject: "Your Foundation Review is complete — here's a copy of your plan",
    body: `Hi ${fullName},\n\nGreat meeting with you today. Your Financial Foundation Plan is attached as a PDF for your records.\n\nIf you'd like ongoing support putting it into practice, you can enroll in Accountability any time from your portal.${incentiveSentence}\n\n${accountabilityUrl}\n\n— Steadwell`,
  };
}

export function accountInvitationTemplate(fullName: string, inviteUrl: string) {
  return {
    subject: "Set up your Steadwell account",
    body: `Hi ${fullName},\n\nYour payment was received — welcome to Steadwell. Use the link below to create your account password and secure your account with two-factor authentication.\n\n${inviteUrl}\n\nThis link expires in 7 days.\n\n— Steadwell`,
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

// Accountability meeting reminder — sent 48h and 24h before a scheduled
// Accountability meeting (see src/lib/meetingReminders.ts), prompting the
// client to jot progress notes in their portal so Coach can reference them
// on the call. Falls into the same auto-send bucket as the offboarding
// reminders above (§21 "meeting reminders" — no draft/review step).
export function accountabilityProgressNotesReminderTemplate(fullName: string, whenLabel: string, portalUrl: string) {
  return {
    subject: `Your Accountability meeting is ${whenLabel} — add your progress notes`,
    body: `Hi ${fullName},\n\nYour Accountability meeting is ${whenLabel}. Take a minute to jot down what you've done since your last check-in — wins, what's been hard, anything you want to make sure we cover — so we can make the best use of our time together.\n\n${portalUrl}\n\n— Steadwell`,
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
