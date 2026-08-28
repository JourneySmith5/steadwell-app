import { PageHeader, Card } from "@/components/ui";

export function Stub({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-brand-slate mb-2">Not built yet in this scaffold.</p>
        <p className="text-xs text-brand-slate/70">{note}</p>
      </Card>
    </div>
  );
}
