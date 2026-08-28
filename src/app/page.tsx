import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-5xl font-semibold text-brand-dark mb-4">Steadwell</h1>
      <p className="text-brand-slate max-w-md mb-8">
        Personal financial coaching for Texas households — a plan built with you, and a
        person in your corner to keep it real.
      </p>
      <div className="flex gap-3">
        <Link href="/apply">
          <Button>Apply to Work Together</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Client / Coach Login</Button>
        </Link>
      </div>
    </main>
  );
}
