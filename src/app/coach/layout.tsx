import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { logout } from "@/app/actions/logout";
import { PushNotifications } from "@/components/PushNotifications";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/coach", label: "Dashboard" },
  { href: "/coach/clients", label: "Clients" },
  { href: "/coach/settings/discount-codes", label: "Discount Codes" },
  { href: "/coach/settings/booking-links", label: "Booking Links" },
];

// Shell for all of /coach*, including the 2FA setup page — so this only
// checks "is this a coach", not "has 2FA been enabled". The stricter check
// lives in coach/(protected)/layout.tsx, applied to everything except
// setup-2fa itself (see that file for why).
export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  await requireRole("coach");

  return (
    <div className="flex-1 flex flex-col">
      <PushNotifications vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <header className="border-b border-brand-pale bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2 font-heading text-xl text-brand-dark">
              <BrandMark className="h-7 w-7 shrink-0" />
              Steadwell
            </span>
            <nav className="flex gap-4">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-sm text-brand-slate hover:text-brand-dark">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-brand-slate hover:text-brand-dark">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
