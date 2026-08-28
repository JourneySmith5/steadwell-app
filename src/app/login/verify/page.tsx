"use client";

import { useActionState } from "react";
import { verifyTotpLogin, type VerifyState } from "./actions";
import { Field, TextInput, Button, ErrorText, Card, PageHeader } from "@/components/ui";

export default function VerifyTotpPage() {
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(verifyTotpLogin, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <PageHeader title="Two-Factor Code" subtitle="Enter the 6-digit code from your authenticator app." />
        <form action={formAction}>
          <Field label="Code" required>
            <TextInput
              name="token"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
            />
          </Field>
          {state?.message && <ErrorText>{state.message}</ErrorText>}
          <Button type="submit" disabled={pending} className="w-full mt-2">
            {pending ? "Verifying…" : "Verify"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
