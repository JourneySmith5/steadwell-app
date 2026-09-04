import "server-only";
import { createMessage, markThreadRead } from "@/lib/repo/messages";
import type { MessageRow } from "@/lib/repo/messages";
import { findClientById } from "@/lib/repo/clients";
import { findOwnerUser, findUserById, type UserRow } from "@/lib/repo/users";
import { sendPushToUser } from "@/lib/webPush";
import { sendDirectEmail } from "@/lib/email";

// Client → Coach. The whole point of a "Need help?" button is that it
// actually reaches a real person, not that it sits unread in an inbox
// nobody checks — so this fires both channels: push (if subscribed) and a
// direct email (bypassing the client-scoped email_logs/sendSystemEmail
// pipeline — a coach-side user has no clients row for that pipeline's
// address lookup to work with, same reasoning as sendPasswordResetEmail in
// src/lib/email.ts).
//
// Reaches this client's assigned coach specifically, not every coach —
// with multiple coaches, coach B shouldn't get paged for coach A's
// client — plus the owner, who sees every client's messages by design.
// Deduped since before any coach is hired (or for a client nobody's
// assigned yet), the only recipient is the owner.
export interface MessageAttachment {
  url: string;
  filename: string;
  contentType: string | null;
}

export async function sendClientMessage(clientId: string, body: string, attachment?: MessageAttachment): Promise<MessageRow> {
  const message = await createMessage({
    clientId,
    senderRole: "client",
    body,
    attachmentUrl: attachment?.url,
    attachmentFilename: attachment?.filename,
    attachmentContentType: attachment?.contentType,
  });
  const client = await findClientById(clientId);
  const clientName = client?.fullName ?? "A client";

  // A file-only message (no caption) has an empty body — quoting "" would
  // read oddly in an email/push, so describe the attachment by name instead.
  const summary = body ? `"${body}"` : `an attachment: ${attachment?.filename ?? "a file"}`;

  const [assignedCoach, owner] = await Promise.all([
    client?.coachId ? findUserById(client.coachId) : Promise.resolve(undefined),
    findOwnerUser(),
  ]);
  const recipients = new Map<string, UserRow>();
  for (const u of [assignedCoach, owner]) if (u) recipients.set(u.id, u);

  await Promise.all(
    Array.from(recipients.values()).map((recipient) =>
      Promise.all([
        sendDirectEmail(
          recipient.email,
          `New message from ${clientName}`,
          `${clientName} sent you ${body ? "a message" : "an attachment"} on Steadwell:\n\n${summary}\n\nReply from the Coach Dashboard: /coach/clients/${clientId}/messages`,
          "email:sent:coach-message-notification"
        ),
        sendPushToUser(recipient.id, {
          title: `New message from ${clientName}`,
          body: body || `Sent an attachment: ${attachment?.filename ?? "a file"}`,
          url: `/coach/clients/${clientId}/messages`,
        }),
      ])
    )
  );

  return message;
}

// Coach → Client. Mirrors the push hook every other client-facing email
// already uses (sendEmailDraft/sendSystemEmail in src/lib/email.ts) — push
// only, no extra email. A coach-initiated reply isn't the "I need a human
// right now" direction a client's own message is, so it doesn't need the
// belt-and-suspenders email channel that sendClientMessage above does.
export async function sendCoachMessage(clientId: string, body: string, attachment?: MessageAttachment): Promise<MessageRow> {
  const message = await createMessage({
    clientId,
    senderRole: "coach",
    body,
    attachmentUrl: attachment?.url,
    attachmentFilename: attachment?.filename,
    attachmentContentType: attachment?.contentType,
  });
  // Replying implies Coach has seen everything in the thread up to now,
  // even if she got here without opening the thread page first (e.g. a
  // future quick-reply-from-inbox affordance) — this keeps the unread
  // count from Coach's own reply making itself "unread by Coach" in error,
  // and clears out anything a race with the page-view mark-as-read missed.
  await markThreadRead(clientId, "coach");

  const client = await findClientById(clientId);
  if (client?.userId) {
    await sendPushToUser(client.userId, {
      title: "New message from Steadwell",
      body: body || `Sent an attachment: ${attachment?.filename ?? "a file"}`,
      url: "/portal/messages",
    });
  }

  return message;
}
