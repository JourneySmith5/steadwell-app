import { requireCoachRole } from "@/lib/dal";
import { logout } from "@/app/actions/logout";
import { PushNotifications } from "@/components/PushNotifications";
import { NavHeader, type NavHeaderItem } from "@/components/NavHeader";
import { countUnreadForCoach } from "@/lib/repo/messages";

// Shell for all of /coach*, including the 2FA setup page — so this only
// checks "is this a coach-side role" (owner or coach), not "has 2FA been
// enabled". The stricter check lives in coach/(protected)/layout.tsx,
// applied to everything except setup-2fa itself (see that file for why).
export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  const user = await requireCoachRole();
  const isOwner = user.role === "owner";
  const unreadMessages = await countUnreadForCoach(isOwner ? undefined : user.id);

  const nav: NavHeaderItem[] = [
    { href: "/coach", label: "Dashboard" },
    { href: "/coach/clients", label: "Clients" },
    { href: "/coach/messages", label: "Messages", badge: unreadMessages },
    // Every coach-side user, not just the owner — this is a coach's own
    // self-service 1099 commission invoicing, not business-wide config.
    { href: "/coach/billing", label: "Billing" },
    // Owner-only: global config, revenue, and the Team roster — a hired
    // coach doesn't manage pricing/booking links or see business numbers,
    // and requireOwner() enforces this server-side too if they typed the
    // URL directly (see dal.ts).
    ...(isOwner
      ? [
          { href: "/coach/team", label: "Team" },
          { href: "/coach/reports", label: "Reports" },
          { href: "/coach/analytics", label: "Analytics" },
          { href: "/coach/settings/discount-codes", label: "Discount Codes" },
          { href: "/coach/settings/booking-links", label: "Booking Links" },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col">
      <PushNotifications vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <NavHeader navItems={nav} logoutAction={logout} maxWidthClassName="max-w-5xl" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
