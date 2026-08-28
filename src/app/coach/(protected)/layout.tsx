import { requireCoach } from "@/lib/dal";

// Full gate (role + 2FA enabled) for everything under /coach except the 2FA
// setup page itself — that page lives in a sibling route group specifically
// so it's NOT wrapped by this layout. Nesting it here would create a
// redirect loop: this layout sends a not-yet-enrolled coach to
// /coach/account/setup-2fa, and if that page were also wrapped by this same
// layout, it would immediately redirect right back to itself.
export default async function CoachProtectedLayout({ children }: LayoutProps<"/coach">) {
  await requireCoach();
  return <>{children}</>;
}
