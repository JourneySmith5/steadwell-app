"use client";

import { useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { deleteClientForever } from "./actions";

// Deliberately outside the normal §16 offboarding flow — this is the
// escape hatch for a client record that's stuck or never should've
// existed (a broken test signup, a duplicate), not the 30-day export
// window a real client is entitled to. Client-side gating (the button
// stays disabled until the typed text matches) is just friction against a
// misclick — the server action re-checks the same match before doing
// anything, since this is irreversible.
export function DeleteClientForm({ clientId, fullName, mismatch }: { clientId: string; fullName: string; mismatch?: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const matches = confirmText.trim().toLowerCase() === fullName.trim().toLowerCase();

  return (
    <form action={deleteClientForever.bind(null, clientId)}>
      <p className="text-sm text-brand-slate mb-3">
        Permanently deletes this client&apos;s account, Foundation Intake, plan, meetings, messages,
        payments, and every other record — immediately, not after the usual 30-day export window. This
        can&apos;t be undone. Type <span className="font-medium text-brand-dark">{fullName}</span> below to
        enable the button.
      </p>
      <TextInput
        name="confirmName"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type the client's full name"
        className="mb-3 max-w-sm"
        autoComplete="off"
      />
      {mismatch && (
        <p className="text-sm text-red-700 mb-3">That didn&apos;t match — nothing was deleted. Try again.</p>
      )}
      <Button type="submit" variant="danger" disabled={!matches}>
        Delete Client Permanently
      </Button>
    </form>
  );
}
