import Link from "next/link";
import { requireCoach } from "@/lib/dal";
import { listThreadSummariesForCoach } from "@/lib/repo/messages";
import { Card, PageHeader } from "@/components/ui";

export default async function CoachMessagesPage() {
  const user = await requireCoach();
  const threads = await listThreadSummariesForCoach(user.role === "owner" ? undefined : user.id);

  return (
    <div>
      <PageHeader title="Messages" subtitle="Every client's conversation with you, most recently active first." />
      {threads.length === 0 && (
        <Card>
          <p className="text-sm text-brand-slate/70 italic">No conversations yet.</p>
        </Card>
      )}
      {threads.map((t) => (
        <Link key={t.clientId} href={`/coach/clients/${t.clientId}/messages`} className="block mb-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-base text-brand-dark truncate">{t.clientFullName}</p>
                <p className="text-sm text-brand-slate truncate">
                  {t.lastMessageSenderRole === "coach" ? "You: " : ""}
                  {t.lastMessageBody}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-brand-slate/60 whitespace-nowrap">
                  {new Date(t.lastMessageAt).toLocaleString()}
                </span>
                {t.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-accent text-white text-xs leading-none">
                    {t.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
