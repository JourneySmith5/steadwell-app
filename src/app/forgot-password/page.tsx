"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";
import { Field, TextInput, Button, ErrorText, SuccessText, Card, PageHeader } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, undefined);
  const submitted = state && "submitted" in state;

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <PageHeader
          title="Reset Your Password"
          subtitle="Enter your account email and we'll send a link to reset your password."
        />
        {submitted ? (
          <>
            <SuccessText>
              If an account exists for that email, we&apos;ve sent a link to reset the password. Check your inbox
              (and spam folder) — the link expires in 1 hour.
            </SuccessText>
            {state.devResetUrl && (
              <p className="text-xs text-brand-slate/60 mt-4 border-t border-brand-pale pt-4">
                Dev mode — no real email is sent yet.{" "}
                <Link href={state.devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className="text-brand-dark underline">
                  Reset now
                </Link>
              </p>
            )}
          </>
        ) : (
          <form action={formAction}>
            <Field label="Email" required>
              <TextInput type="email" name="email" required autoComplete="email" />
            </Field>
            {state && "message" in state && <ErrorText>{state.message}</ErrorText>}
            <Button type="submit" disabled={pending} className="w-full mt-2">
              {pending ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        )}
        <p className="text-sm text-brand-slate mt-4">
          <Link href="/login" className="text-brand-dark underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
