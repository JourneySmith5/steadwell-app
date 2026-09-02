"use client";

import { use, useActionState } from "react";
import { completePasswordReset, type ResetPasswordState } from "./actions";
import { Field, TextInput, Button, ErrorText, Card, PageHeader } from "@/components/ui";

export default function ResetPasswordPage(props: PageProps<"/reset-password/[token]">) {
  const { token } = use(props.params);
  const boundAction = completePasswordReset.bind(null, token);
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(boundAction, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <PageHeader title="Choose a New Password" />
        <form action={formAction}>
          <Field label="New password" required hint="8+ characters, 1 uppercase, 1 number, 1 special character.">
            <TextInput type="password" name="password" required autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" required>
            <TextInput type="password" name="confirmPassword" required autoComplete="new-password" />
          </Field>
          {state?.message && <ErrorText>{state.message}</ErrorText>}
          {state?.errors?.map((e) => (
            <ErrorText key={e}>{e}</ErrorText>
          ))}
          <Button type="submit" disabled={pending} className="w-full mt-2">
            {pending ? "Saving…" : "Reset Password"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
