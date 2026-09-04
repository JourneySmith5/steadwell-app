import { all, get, run, newId } from "@/lib/db/client";

export type MessageSenderRole = "coach" | "client";

interface MessageDbRow {
  id: string;
  client_id: string;
  sender_role: string;
  body: string;
  created_at: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_filename: string | null;
  attachment_content_type: string | null;
}

export interface MessageRow {
  id: string;
  clientId: string;
  senderRole: MessageSenderRole;
  body: string;
  createdAt: string;
  readAt: string | null;
  attachmentUrl: string | null;
  attachmentFilename: string | null;
  attachmentContentType: string | null;
}

function fromRow(row: MessageDbRow): MessageRow {
  return {
    id: row.id,
    clientId: row.client_id,
    senderRole: row.sender_role as MessageSenderRole,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    attachmentUrl: row.attachment_url,
    attachmentFilename: row.attachment_filename,
    attachmentContentType: row.attachment_content_type,
  };
}

// Cheap count for the client detail page's summary card (src/app/coach/...
// /clients/[id]/page.tsx) — avoids fetching the full message list just to
// show "N messages".
export async function countMessagesForClient(clientId: string): Promise<number> {
  const row = await get<{ count: string }>(`SELECT COUNT(*) as count FROM messages WHERE client_id = $clientId`, {
    $clientId: clientId,
  });
  return row ? Number(row.count) : 0;
}

export async function listMessagesForClient(clientId: string): Promise<MessageRow[]> {
  const rows = await all<MessageDbRow>(
    `SELECT * FROM messages WHERE client_id = $clientId ORDER BY created_at ASC`,
    { $clientId: clientId }
  );
  return rows.map(fromRow);
}

export async function createMessage(params: {
  clientId: string;
  senderRole: MessageSenderRole;
  body: string;
  attachmentUrl?: string | null;
  attachmentFilename?: string | null;
  attachmentContentType?: string | null;
}): Promise<MessageRow> {
  const id = newId();
  await run(
    `INSERT INTO messages (id, client_id, sender_role, body, attachment_url, attachment_filename, attachment_content_type)
     VALUES ($id, $clientId, $senderRole, $body, $attachmentUrl, $attachmentFilename, $attachmentContentType)`,
    {
      $id: id,
      $clientId: params.clientId,
      $senderRole: params.senderRole,
      $body: params.body,
      $attachmentUrl: params.attachmentUrl ?? null,
      $attachmentFilename: params.attachmentFilename ?? null,
      $attachmentContentType: params.attachmentContentType ?? null,
    }
  );
  const row = await get<MessageDbRow>(`SELECT * FROM messages WHERE id = $id`, { $id: id });
  return fromRow(row!);
}

export async function findMessageById(id: string): Promise<MessageRow | undefined> {
  const row = await get<MessageDbRow>(`SELECT * FROM messages WHERE id = $id`, { $id: id });
  return row ? fromRow(row) : undefined;
}

// Every message in this client's thread that carries a file — the
// Documents page's "sent via message" section (src/app/portal/(protected)/
// documents/page.tsx), so a client can find something they attached weeks
// ago without having to scroll back through the whole conversation.
export async function listMessageAttachmentsForClient(clientId: string): Promise<MessageRow[]> {
  const rows = await all<MessageDbRow>(
    `SELECT * FROM messages WHERE client_id = $clientId AND attachment_url IS NOT NULL ORDER BY created_at DESC`,
    { $clientId: clientId }
  );
  return rows.map(fromRow);
}

// Marks every message in this thread NOT sent by `readerRole` as read —
// i.e. "the coach opened this thread" marks every client-sent message read,
// and vice versa. A no-op UPDATE (WHERE read_at IS NULL) rather than
// per-message tracking, since there are only ever two parties in a thread.
export async function markThreadRead(clientId: string, readerRole: MessageSenderRole): Promise<void> {
  const otherRole: MessageSenderRole = readerRole === "coach" ? "client" : "coach";
  await run(
    `UPDATE messages SET read_at = now() WHERE client_id = $clientId AND sender_role = $otherRole AND read_at IS NULL`,
    { $clientId: clientId, $otherRole: otherRole }
  );
}

// Unread count for one client's thread, from `readerRole`'s point of view
// (i.e. messages the OTHER party sent that this reader hasn't read yet).
export async function countUnreadForClientThread(clientId: string, readerRole: MessageSenderRole): Promise<number> {
  const otherRole: MessageSenderRole = readerRole === "coach" ? "client" : "coach";
  const row = await get<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages WHERE client_id = $clientId AND sender_role = $otherRole AND read_at IS NULL`,
    { $clientId: clientId, $otherRole: otherRole }
  );
  return row ? Number(row.count) : 0;
}

// Total unread count across every client thread the caller can see — the
// badge shown in the Coach nav. Omit coachId for the owner's "everyone"
// view; pass it to scope to one coach's own assigned clients.
export async function countUnreadForCoach(coachId?: string): Promise<number> {
  const row = coachId
    ? await get<{ count: string }>(
        `SELECT COUNT(*) as count FROM messages m JOIN clients c ON c.id = m.client_id
         WHERE m.sender_role = 'client' AND m.read_at IS NULL AND c.coach_id = $coachId`,
        { $coachId: coachId }
      )
    : await get<{ count: string }>(
        `SELECT COUNT(*) as count FROM messages WHERE sender_role = 'client' AND read_at IS NULL`
      );
  return row ? Number(row.count) : 0;
}

export interface MessageThreadSummary {
  clientId: string;
  clientFullName: string;
  lastMessageAt: string;
  lastMessageBody: string;
  lastMessageSenderRole: MessageSenderRole;
  unreadCount: number;
}

// Coach inbox listing (src/app/coach/messages) — one row per client who
// has ever exchanged a message, most recently active thread first, each
// with its own unread count and the client's name (joined in directly so
// the page isn't doing an N+1 findClientById per row). DISTINCT ON
// (client_id) ordered by created_at DESC picks each thread's most recent
// message in one pass; the unread count is a correlated subquery per row,
// which is fine at this app's scale (one coach's client list, not a
// high-volume inbox). Omit coachId for the owner's "every client" inbox;
// pass it to scope to one coach's own assigned clients only.
export async function listThreadSummariesForCoach(coachId?: string): Promise<MessageThreadSummary[]> {
  const rows = await all<{
    client_id: string;
    client_full_name: string;
    last_message_at: string;
    last_message_body: string;
    last_message_sender_role: string;
    unread_count: string;
  }>(
    `SELECT * FROM (
       SELECT DISTINCT ON (m.client_id)
         m.client_id,
         c.full_name AS client_full_name,
         m.created_at AS last_message_at,
         m.body AS last_message_body,
         m.sender_role AS last_message_sender_role,
         (SELECT COUNT(*) FROM messages u WHERE u.client_id = m.client_id AND u.sender_role = 'client' AND u.read_at IS NULL) AS unread_count
       FROM messages m
       JOIN clients c ON c.id = m.client_id
       ${coachId ? "WHERE c.coach_id = $coachId" : ""}
       ORDER BY m.client_id, m.created_at DESC
     ) threads
     ORDER BY last_message_at DESC`,
    coachId ? { $coachId: coachId } : undefined
  );
  return rows.map((row) => ({
    clientId: row.client_id,
    clientFullName: row.client_full_name,
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
    lastMessageSenderRole: row.last_message_sender_role as MessageSenderRole,
    unreadCount: Number(row.unread_count),
  }));
}
