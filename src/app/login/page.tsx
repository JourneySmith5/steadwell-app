"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Field, TextInput, Button, ErrorText, SuccessText, Card, PageHeader } from "@/components/ui";

export default function LoginPage(props: PageProps<"/login">) {
  const { reset } = use(props.searchParams);
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <PageHeader title="Sign In" />
        {reset === "success" && <SuccessText>Password updated — sign in with your new password.</SuccessText>}
        <form action={formAction}>
          <Field label="Email" required>
            <TextInput type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <TextInput type="password" name="password" required autoComplete="current-password" />
          </Field>
          {state?.message && <ErrorText>{state.message}</ErrorText>}
          <Button type="submit" disabled={pending} className="w-full mt-2">
            {pending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
        <p className="text-sm text-brand-slate mt-4">
          <Link href="/forgot-password" className="text-brand-dark underline">
            Forgot your password?
          </Link>
        </p>
      </Card>
    </main>
  );
}
