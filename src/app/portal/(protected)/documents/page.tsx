import { requireClient } from "@/lib/dal";
import { Stub } from "@/components/Stub";

export default async function DocumentsPage() {
  await requireClient();
  return (
    <Stub
      title="Documents"
      note="Upload/replace three months of statements, completeness tracking by account + month. Needs encrypted file storage wired up (e.g. S3/Supabase Storage) — not connected yet."
    />
  );
}
