import Link from "next/link";
import { requireClientAccess } from "@/lib/dal";
import { listMessagesForClient, markThreadRead } from "@/lib/repo/messages";
import { Card, PageHeader, TextArea, Button } from "@/components/ui";
import { replyToClient } from "./actions";

export default async function CoachClientMessagesPage(props: PageProps<"/coach/clients/[id]/messages">) {
  const { id: clientId } = await props.params;
  const { client } = await requireClientAccess(clientId);

  const messages = await listMessagesForClient(clientId);
  // Opening this thread is what "reading" it means — same idea as opening
  // an email marks it read. A write during a Server Component's render is
  // unusual, but this route is never statically cached (it's inside the
  // (protected) auth-gated group, always dynamic per-request), so there's
  // no risk of this side effect firing on a page that isn't actually being
  // viewed right now.
  await markThreadRead(clientId, "coach");

  return (
    <div>
      <Link href={`/coach/clients/${clientId}`} className="text-sm text-brand-slate hover:text-brand-dark">
        ← {client.fullName}
      </Link>
      <PageHeader title={`Messages — ${client.fullName}`} />

      <Card className="mb-6">
        {messages.length === 0 && <p className="text-sm text-brand-slate/70 italic mb-4">No messages yet.</p>}
        <div className="flex flex-col gap-3 mb-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.senderRole === "coach" ? "self-end items-end" : "self-start items-start"} flex flex-col`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.senderRole === "coach" ? "bg-brand-dark text-white" : "bg-brand-pale text-brand-dark"
                }`}
              >
                {m.body}
              </div>
              <span className="text-[11px] text-brand-slate/60 mt-1">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <form action={replyToClient.bind(null, clientId)}>
          <TextArea name="body" rows={3} placeholder="Reply to this client…" required />
          <div className="mt-2">
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
