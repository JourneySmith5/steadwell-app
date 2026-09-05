"use client";

import { useState } from "react";
import { Button, Field, Select, TextArea, TextInput } from "@/components/ui";
import { publishNotice } from "./actions";
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_LABELS } from "@/lib/enums";

// Emails every currently-enrolled client the moment this submits (see
// publishLegalNotice) — the typed-confirmation gate mirrors
// RefundFoundationFeeForm/DeleteClientForm's pattern: friction against a
// misclick, not the actual safety. The server action re-checks the typed
// text and the 30-day minimum itself.
export function PublishNoticeForm({ minDate }: { minDate: string }) {
  const [confirmText, setConfirmText] = useState("");
  const matches = confirmText.trim().toUpperCase() === "NOTIFY";

  return (
    <form action={publishNotice} className="space-y-4">
      <Field label="Document" required>
        <Select name="document" defaultValue={LEGAL_DOCUMENTS[0]}>
          {LEGAL_DOCUMENTS.map((doc) => (
            <option key={doc} value={doc}>
              {LEGAL_DOCUMENT_LABELS[doc]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Effective date" required hint={`Must be at least 30 days from today (earliest: ${minDate}).`}>
        <TextInput type="date" name="effectiveDate" min={minDate} required />
      </Field>
      <Field label="What's changing" required hint="Plain-language summary — this goes straight into the client email and Portal banner.">
        <TextArea name="summary" rows={4} required />
      </Field>
      <div>
        <p className="text-sm text-brand-slate mb-2">
          This immediately emails every currently-enrolled client and posts a Portal banner until the
          effective date. Type <span className="font-medium text-brand-dark">NOTIFY</span> below to enable
          the button.
        </p>
        <TextInput
          name="confirmPublish"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type NOTIFY"
          className="mb-3 max-w-sm"
          autoComplete="off"
        />
        <Button type="submit" disabled={!matches}>
          Publish Notice &amp; Notify Clients
        </Button>
      </div>
    </form>
  );
}
