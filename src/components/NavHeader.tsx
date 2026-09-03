"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export interface NavHeaderItem {
  href: string;
  label: string;
  // Unread-style badge (e.g. Messages). Omitted/0 renders no badge.
  badge?: number;
}

// Shared header for both /coach* and /portal* — used to be duplicated
// inline in each layout as a single horizontal <nav> row (see git history),
// which broke down on a real phone screen: enough nav items (Dashboard,
// Clients, Discount Codes, Booking Links, Messages, Sign out) to overflow
// the viewport width, wrapping mid-label and running the last item or two
// off the edge entirely — not just ugly, actually unusable (Journey
// couldn't reach "Sign out" from her phone). Below the `md` breakpoint this
// collapses to a hamburger button that opens a panel overlapping the page
// (position: fixed, not pushing content down) instead of trying to cram
// everything into one row; at `md` and up it's the original horizontal bar,
// unchanged in appearance from before this component existed.
export function NavHeader({
  navItems,
  logoutAction,
  maxWidthClassName = "max-w-5xl",
  rightSlot,
}: {
  navItems: NavHeaderItem[];
  logoutAction: (formData: FormData) => void | Promise<void>;
  maxWidthClassName?: string;
  // Rendered next to the hamburger button on mobile (always visible, no
  // need to open the panel) and next to Sign out on desktop — for the
  // portal's "Need help?" icon, which should stay one tap away at all
  // times, not buried inside the collapsed nav.
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-brand-pale bg-white relative">
      <div className={`${maxWidthClassName} mx-auto px-6 py-3 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-8 min-w-0">
          <span className="flex items-center gap-2 font-heading text-xl text-brand-dark shrink-0">
            <BrandMark className="h-7 w-7 shrink-0" />
            Steadwell
          </span>
          <nav className="hidden md:flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-brand-slate hover:text-brand-dark whitespace-nowrap relative"
              >
                {item.label}
                {!!item.badge && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand-accent text-white text-[10px] leading-none align-middle">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {rightSlot}
          <form action={logoutAction} className="hidden md:block">
            <button type="submit" className="text-sm text-brand-slate hover:text-brand-dark whitespace-nowrap">
              Sign out
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="md:hidden flex flex-col justify-center items-center gap-1.5 h-9 w-9 shrink-0"
          >
            <span className={`block h-0.5 w-6 bg-brand-dark transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-6 bg-brand-dark transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-6 bg-brand-dark transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Backdrop — closes the panel on tap, doesn't scroll with the page. */}
          <div className="md:hidden fixed inset-0 top-[57px] bg-black/30 z-40" onClick={() => setOpen(false)} />
          {/* The panel itself overlaps page content (position: fixed) rather
              than pushing it down, so opening the menu never reflows
              whatever the person was reading. */}
          <nav className="md:hidden fixed top-[57px] left-0 right-0 bg-white border-b border-brand-pale shadow-lg z-50 max-h-[calc(100vh-57px)] overflow-y-auto">
            <div className="flex flex-col py-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-6 py-3 text-base text-brand-slate hover:text-brand-dark hover:bg-brand-pale/30 flex items-center justify-between"
                >
                  {item.label}
                  {!!item.badge && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-accent text-white text-xs leading-none">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              ))}
              <form action={logoutAction} className="border-t border-brand-pale mt-2 pt-2">
                <button
                  type="submit"
                  className="w-full text-left px-6 py-3 text-base text-brand-slate hover:text-brand-dark hover:bg-brand-pale/30"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
