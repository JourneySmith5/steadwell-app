"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Card, Button, Field, ErrorText } from "@/components/ui";
import { recordStatementUpload } from "./actions";

// Replaces the old plain <form action={uploadStatement}> multipart upload.
// That version sent every file's bytes through our own serverless function
// in one request, which Vercel/Next.js cap well below what a real batch of
// scanned bank statements needs (see next.config.ts) — a client selecting
// several files at once got a hard "this page couldn't load" failure with
// no way to tell what went wrong. This uploads each file straight from the
// browser to Blob storage instead (via a short-lived token from
// /api/statements/upload-token), so the file bytes never pass through our
// function at all, then records each one with the server as it finishes.
//
// No account picker anymore — it used to require choosing one account per
// submission, which meant a separate upload trip for each account. Coach
// opens each file directly to see which account/period it's for, so this
// is just: pick files, upload.
export function UploadStatementForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<{ uploading: boolean; doneCount: number; total: number }>({
    uploading: false,
    doneCount: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Choose at least one file to upload.");
      return;
    }

    setStatus({ uploading: true, doneCount: 0, total: files.length });

    // Sequential, not parallel — several large files uploading at once
    // would compete for the same connection and make any one failure
    // harder to attribute to a specific file. One at a time is plenty
    // fast for the handful of statements a client uploads in one sitting.
    for (const file of files) {
      try {
        const blob = await upload(`statements/${clientId}/${Date.now()}-${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/statements/upload-token",
          contentType: file.type || undefined,
        });

        const result = await recordStatementUpload({
          fileUrl: blob.url,
          originalFilename: file.name,
        });

        if (!result.ok) {
          setError(`${file.name}: ${result.error}`);
          setStatus({ uploading: false, doneCount: 0, total: 0 });
          return;
        }
      } catch {
        setError(`${file.name} failed to upload — check your connection and try again.`);
        setStatus({ uploading: false, doneCount: 0, total: 0 });
        return;
      }

      setStatus((s) => ({ ...s, doneCount: s.doneCount + 1 }));
    }

    setStatus({ uploading: false, doneCount: 0, total: 0 });
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // recordStatementUpload's revalidatePath already invalidated the
    // cached statements list; this re-renders the (server-component)
    // page with it so the new rows show up without a full page reload.
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-heading text-lg text-brand-dark mb-3">Upload a Statement</h2>
      {error && <ErrorText>{error}</ErrorText>}
      <form onSubmit={handleSubmit}>
        <Field label="Files" required>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            required
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-brand-slate file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-brand-pale file:text-brand-dark file:text-sm file:font-medium hover:file:bg-brand-pale/70"
          />
          <p className="text-xs text-brand-slate/60 mt-1">
            Select multiple files at once (e.g. ctrl/cmd-click) — no need to label or separate them by account or
            month.
          </p>
        </Field>
        <Button type="submit" disabled={status.uploading}>
          {status.uploading ? `Uploading ${status.doneCount + 1} of ${status.total}…` : "Upload"}
        </Button>
      </form>
    </Card>
  );
}
