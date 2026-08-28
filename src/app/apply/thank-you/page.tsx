import Link from "next/link";
import { Card, Button } from "@/components/ui";

export default function ThankYouPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <Card className="max-w-md text-center">
        <h1 className="font-heading text-2xl text-brand-dark mb-3">Application received</h1>
        <p className="text-brand-slate mb-6">
          Thanks for applying to Steadwell. Coach will review your application and follow up by
          email to let you know next steps — you don&apos;t have portal access yet.
        </p>
        <Link href="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </Card>
    </main>
  );
}
