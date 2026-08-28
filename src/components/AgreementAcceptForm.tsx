"use client";

import { useActionState } from "react";
import { acceptAgreement, type AcceptAgreementState } from "@/app/agreement/[token]/actions";
import { Field, TextInput, CheckboxField, Button, ErrorText, Card } from "@/components/ui";

export function AgreementAcceptForm({ token }: { token: string }) {
  const boundAction = acceptAgreement.bind(null, token);
  const [state, formAction, pending] = useActionState<AcceptAgreementState, FormData>(boundAction, undefined);

  return (
    <Card className="mt-4">
      <form action={formAction}>
        <Field label="Type your full legal name" required hint="This is your electronic signature on this Agreement.">
          <TextInput name="fullName" required autoComplete="name" />
        </Field>
        <CheckboxField name="agree" required label="I have read, understood, and agree to all terms above." />
        {state?.message && <ErrorText>{state.message}</ErrorText>}
        <Button type="submit" disabled={pending} className="w-full mt-2">
          {pending ? "Submitting…" : "Accept & Continue to Payment"}
        </Button>
      </form>
    </Card>
  );
}
