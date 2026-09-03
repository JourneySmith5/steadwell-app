import { redirect } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { listMessagesForClient, markThreadRead } from "@/lib/repo/messages";
import { Card, PageHeader, TextArea, Button } from "@/components/ui";
import { sendMessage } from "./actions";

export default async function ClientMessagesPage() {
  const user = await requireClient();
  if (!user.client) redirect("/login");

  const messages = await listMessagesForClient(user.client.id);
  // Same reasoning as the coach-side thread page: opening this page is what
  // "reading" it means, and this route is always dynamic (auth-gated, never
  // statically cached), so a write during render can't fire on a page that
  // isn't actually being viewed.
  await markThreadRead(user.client.id, "client");

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="A direct line to your coach — for anything that can't wait for your next scheduled meeting."
      />

      <Card>
        {messages.length === 0 && (
          <p className="text-sm text-brand-slate/70 italic mb-4">
            No messages yet. Send one below and your coach will be notified right away.
          </p>
        )}
        <div className="flex flex-col gap-3 mb-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.senderRole === "client" ? "self-end items-end" : "self-start items-start"} flex flex-col`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.senderRole === "client" ? "bg-brand-dark text-white" : "bg-brand-pale text-brand-dark"
                }`}
              >
                {m.body}
              </div>
              <span className="text-[11px] text-brand-slate/60 mt-1">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <form action={sendMessage}>
          <TextArea name="body" rows={3} placeholder="Type a message to your coach…" required />
          <div className="mt-2">
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
