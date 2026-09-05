"use client";

import { useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { refundFoundationPayment } from "./actions";

// Real money movement (a live Stripe refund, or the test-mode equivalent —
// see refundFoundationPayment) — the typed-confirmation gate mirrors
// DeleteClientForm's pattern: friction against a misclick, not the actual
// safety. The server action re-checks both the typed text and the
// eligibility window (client hasn't submitted Foundation Intake yet)
// itself, since client-side validation alone is never something to trust
// for something irreversible.
export function RefundFoundationFeeForm({
  clientId,
  amountLabel,
  mismatch,
}: {
  clientId: string;
  amountLabel: string;
  mismatch?: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const matches = confirmText.trim().toUpperCase() === "REFUND";

  return (
    <form action={refundFoundationPayment.bind(null, clientId)}>
      <p className="text-sm text-brand-slate mb-3">
        Issues a real refund of {amountLabel} to this client — through Stripe if it&apos;s configured, and
        immediately ends the engagement (starting the normal 30-day export/deletion clock, same as any
        other cancellation). Only available because they haven&apos;t submitted their Foundation Intake
        yet. Type <span className="font-medium text-brand-dark">REFUND</span> below to enable the button.
      </p>
      <TextInput
        name="confirmRefund"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type REFUND"
        className="mb-3 max-w-sm"
        autoComplete="off"
      />
      {mismatch && <p className="text-sm text-red-700 mb-3">That didn&apos;t match — nothing was refunded. Try again.</p>}
      <Button type="submit" variant="danger" disabled={!matches}>
        Refund {amountLabel}
      </Button>
    </form>
  );
}
