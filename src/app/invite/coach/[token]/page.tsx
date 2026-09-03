"use client";

import { use, useActionState } from "react";
import { acceptCoachInvitation, type SetPasswordState } from "./actions";
import { Field, TextInput, Button, ErrorText, Card, PageHeader } from "@/components/ui";

export default function CoachInvitePage(props: PageProps<"/invite/coach/[token]">) {
  const { token } = use(props.params);
  const boundAction = acceptCoachInvitation.bind(null, token);
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(boundAction, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <PageHeader title="Set Up Your Coach Account" subtitle="Create a password to secure your Steadwell account." />
        <form action={formAction}>
          <Field label="Password" required hint="8+ characters, 1 uppercase, 1 number, 1 special character.">
            <TextInput type="password" name="password" required autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" required>
            <TextInput type="password" name="confirmPassword" required autoComplete="new-password" />
          </Field>
          {state?.message && <ErrorText>{state.message}</ErrorText>}
          {state?.errors?.map((e) => (
            <ErrorText key={e}>{e}</ErrorText>
          ))}
          <Button type="submit" disabled={pending} className="w-full mt-2">
            {pending ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
