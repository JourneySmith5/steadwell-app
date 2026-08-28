"use client";

import { useActionState } from "react";
import { confirmTotpSetup, type TotpConfirmState } from "@/lib/actions/totp";
import { Field, TextInput, Button, ErrorText, Card, PageHeader } from "@/components/ui";

export function TotpSetupForm({
  qrDataUrl,
  secret,
  redirectTo,
}: {
  qrDataUrl: string;
  secret: string;
  redirectTo: string;
}) {
  const boundAction = confirmTotpSetup.bind(null, redirectTo);
  const [state, formAction, pending] = useActionState<TotpConfirmState, FormData>(boundAction, undefined);

  return (
    <Card className="max-w-sm w-full">
      <PageHeader
        title="Set Up Two-Factor Authentication"
        subtitle="Required before you can access your secure account."
      />
      <div className="flex justify-center mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, not a static asset */}
        <img src={qrDataUrl} alt="Scan with your authenticator app" width={200} height={200} />
      </div>
      <p className="text-xs text-brand-slate/70 mb-4 break-all">
        Can&apos;t scan? Enter this key manually: <code>{secret}</code>
      </p>
      <form action={formAction}>
        <Field label="Enter the 6-digit code to confirm" required>
          <TextInput name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus />
        </Field>
        {state?.message && <ErrorText>{state.message}</ErrorText>}
        <Button type="submit" disabled={pending} className="w-full mt-2">
          {pending ? "Confirming…" : "Confirm & Enable"}
        </Button>
      </form>
    </Card>
  );
}
