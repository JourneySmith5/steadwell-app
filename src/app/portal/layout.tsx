import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { logout } from "@/app/actions/logout";
import { PushNotifications } from "@/components/PushNotifications";
import { NavHeader, type NavHeaderItem } from "@/components/NavHeader";
import { countUnreadForClientThread } from "@/lib/repo/messages";

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
  const unreadMessages = user.client ? await countUnreadForClientThread(user.client.id, "client") : 0;

  // Nav order matches §10, with Messages added at the end.
  const nav: NavHeaderItem[] = [
    { href: "/portal", label: "Home" },
    { href: "/portal/foundation", label: "Financial Foundation" },
    { href: "/portal/documents", label: "Documents" },
    { href: "/portal/plan", label: "My Plan" },
    { href: "/portal/accountability", label: "Accountability" },
    { href: "/portal/billing", label: "Billing" },
    { href: "/portal/messages", label: "Messages", badge: unreadMessages },
    { href: "/portal/account", label: "Account" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <PushNotifications vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      <NavHeader
        navItems={nav}
        logoutAction={logout}
        maxWidthClassName="max-w-4xl"
        rightSlot={
          // Always one tap away, not buried behind the hamburger — the
          // whole point of a "Need help?" affordance is that it's visible
          // the moment someone needs it, per Journey's request.
          <Link
            href="/portal/messages"
            className="relative flex items-center gap-1.5 text-sm text-brand-dark font-medium whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 19H8a5 5 0 1 1 5-5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v.01M12 11a1.5 1.5 0 1 0-1.5-1.5" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="hidden sm:inline">Need help?</span>
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 sm:static sm:ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand-accent text-white text-[10px] leading-none">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>
        }
      />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
