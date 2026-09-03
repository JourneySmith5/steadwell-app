import { requireRole } from "@/lib/dal";
import { logout } from "@/app/actions/logout";
import { PushNotifications } from "@/components/PushNotifications";
import { NavHeader, type NavHeaderItem } from "@/components/NavHeader";
import { countUnreadForCoach } from "@/lib/repo/messages";

// Shell for all of /coach*, including the 2FA setup page — so this only
// checks "is this a coach", not "has 2FA been enabled". The stricter check
// lives in coach/(protected)/layout.tsx, applied to everything except
// setup-2fa itself (see that file for why).
export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  await requireRole("coach");
  const unreadMessages = await countUnreadForCoach();

  const nav: NavHeaderItem[] = [
    { href: "/coach", label: "Dashboard" },
    { href: "/coach/clients", label: "Clients" },
    { href: "/coach/messages", label: "Messages", badge: unreadMessages },
    { href: "/coach/settings/discount-codes", label: "Discount Codes" },
    { href: "/coach/settings/booking-links", label: "Booking Links" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <PushNotifications vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <NavHeader navItems={nav} logoutAction={logout} maxWidthClassName="max-w-5xl" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
