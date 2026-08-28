import { notFound } from "next/navigation";
import { findEmailById } from "@/lib/repo/emails";
import { EmailEditor } from "@/components/EmailEditor";

export default async function EmailEditPage(props: PageProps<"/coach/clients/[id]/email/[emailId]">) {
  const { id, emailId } = await props.params;
  const email = await findEmailById(emailId);
  if (!email || email.clientId !== id) notFound();

  return (
    <EmailEditor
      clientId={id}
      emailId={email.id}
      initialSubject={email.subject}
      initialBody={email.body}
      status={email.status}
    />
  );
}
