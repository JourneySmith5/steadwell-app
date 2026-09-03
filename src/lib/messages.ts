import "server-only";
import { createMessage, markThreadRead } from "@/lib/repo/messages";
import type { MessageRow } from "@/lib/repo/messages";
import { findClientById } from "@/lib/repo/clients";
import { findCoachUser } from "@/lib/repo/users";
import { sendPushToCoach, sendPushToUser } from "@/lib/webPush";
import { sendDirectEmail } from "@/lib/email";

// Client → Coach. The whole point of a "Need help?" button is that it
// actually reaches Journey, not that it sits unread in an inbox she might
// not check — so this fires both channels: push (if she has a
// subscription) and a direct email (bypassing the client-scoped
// email_logs/sendSystemEmail pipeline — Coach has no clients row for that
// pipeline's address lookup to work with, same reasoning as
// sendPasswordResetEmail in src/lib/email.ts).
export async function sendClientMessage(clientId: string, body: string): Promise<MessageRow> {
  const message = await createMessage({ clientId, senderRole: "client", body });
  const [client, coach] = await Promise.all([findClientById(clientId), findCoachUser()]);
  const clientName = client?.fullName ?? "A client";

  if (coach) {
    await sendDirectEmail(
      coach.email,
      `New message from ${clientName}`,
      `${clientName} sent you a message on Steadwell:\n\n"${body}"\n\nReply from the Coach Dashboard: /coach/clients/${clientId}/messages`,
      "email:sent:coach-message-notification"
    );
  }
  await sendPushToCoach({
    title: `New message from ${clientName}`,
    body,
    url: `/coach/clients/${clientId}/messages`,
  });

  return message;
}

// Coach → Client. Mirrors the push hook every other client-facing email
// already uses (sendEmailDraft/sendSystemEmail in src/lib/email.ts) — push
// only, no extra email. A coach-initiated reply isn't the "I need a human
// right now" direction a client's own message is, so it doesn't need the
// belt-and-suspenders email channel that sendClientMessage above does.
export async function sendCoachMessage(clientId: string, body: string): Promise<MessageRow> {
  const message = await createMessage({ clientId, senderRole: "coach", body });
  // Replying implies Coach has seen everything in the thread up to now,
  // even if she got here without opening the thread page first (e.g. a
  // future quick-reply-from-inbox affordance) — this keeps the unread
  // count from Coach's own reply making itself "unread by Coach" in error,
  // and clears out anything a race with the page-view mark-as-read missed.
  await markThreadRead(clientId, "coach");

  const client = await findClientById(clientId);
  if (client?.userId) {
    await sendPushToUser(client.userId, { title: "New message from Steadwell", body, url: "/portal/messages" });
  }

  return message;
}
