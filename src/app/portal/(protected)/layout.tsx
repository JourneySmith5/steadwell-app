import { requireClient } from "@/lib/dal";

// See portal/layout.tsx and coach/(protected)/layout.tsx for why this full
// gate (role + email verified + 2FA enabled) is split out from the shell
// layout instead of applied to all of /portal*.
export default async function PortalProtectedLayout({ children }: LayoutProps<"/portal">) {
  await requireClient();
  return <>{children}</>;
}
