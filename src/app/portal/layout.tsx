import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { logout } from "@/app/actions/logout";

// Nav order matches §10 exactly — keep it small.
const NAV = [
  { href: "/portal", label: "Home" },
  { href: "/portal/foundation", label: "Financial Foundation" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/plan", label: "My Plan" },
  { href: "/portal/accountability", label: "Accountability" },
  { href: "/portal/billing", label: "Billing" },
  { href: "/portal/account", label: "Account" },
];

// Shell for all of /portal*, including the 2FA setup page — so this only
// checks "is this a client" and "is their email verified" (that redirect
// target, /verify-email/pending, isn't nested under /portal, so it can't
// loop). The 2FA-enabled check lives in portal/(protected)/layout.tsx,
// applied to everything except setup-2fa itself — nesting it here would
// create a redirect loop back to this same page (see that file).
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const user = await requireRole("client");
  if (!user.emailVerified) {
    redirect("/verify-email/pending");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-brand-pale bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-heading text-xl text-brand-dark">Steadwell</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-brand-slate hover:text-brand-dark">
              Sign out
            </button>
          </form>
        </div>
        <nav className="max-w-4xl mx-auto px-6 flex gap-5 overflow-x-auto pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-brand-slate hover:text-brand-dark whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
