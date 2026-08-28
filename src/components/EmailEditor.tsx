"use client";

import { useActionState } from "react";
import { sendEmail, type SendEmailState } from "@/app/coach/(protected)/clients/[id]/email/[emailId]/actions";
import { Field, TextInput, TextArea, Button, ErrorText, Card, PageHeader } from "@/components/ui";

export function EmailEditor({
  clientId,
  emailId,
  initialSubject,
  initialBody,
  status,
}: {
  clientId: string;
  emailId: string;
  initialSubject: string;
  initialBody: string;
  status: "draft" | "sent";
}) {
  const boundAction = sendEmail.bind(null, clientId, emailId);
  const [state, formAction, pending] = useActionState<SendEmailState, FormData>(boundAction, undefined);

  return (
    <Card className="max-w-2xl">
      <PageHeader
        title="Review Before Sending"
        subtitle="Never auto-sent — edit anything before it goes out."
      />
      <form action={formAction}>
        <Field label="Subject" required>
          <TextInput name="subject" defaultValue={initialSubject} required disabled={status === "sent"} />
        </Field>
        <Field label="Body" required>
          <TextArea name="body" defaultValue={initialBody} rows={10} required disabled={status === "sent"} />
        </Field>
        {state?.message && <ErrorText>{state.message}</ErrorText>}
        {status === "sent" ? (
          <p className="text-sm text-brand-sage font-medium">Sent.</p>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
        )}
      </form>
    </Card>
  );
}
