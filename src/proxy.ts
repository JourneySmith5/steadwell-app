import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { createHash } from "node:crypto";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { recordPageView, type PageViewArea } from "@/lib/repo/pageViews";

// Internal usage analytics (Privacy Policy §1.2/§2(7)) — see schema.sql's
// page_views comment for the full privacy reasoning. Named proxy.ts, not
// middleware.ts, per this Next.js version's rename (see
// node_modules/next/dist/docs/.../proxy.md) — same feature, defaults to
// the Node.js runtime here, which is what makes a direct Postgres write
// from this file possible at all (no Edge-runtime workaround needed).
//
// Scoped to /portal and /coach — the actual coaching "Platform" the
// Privacy Policy describes usage tracking for, not the public marketing
// pages (/  /apply, /login, /privacy, /terms), which aren't logged at all.
export const config = {
  matcher: ["/portal/:path*", "/coach/:path*"],
};

function areaFor(pathname: string): PageViewArea | null {
  if (pathname.startsWith("/portal")) return "client_portal";
  if (pathname.startsWith("/coach")) return "coach_side";
  return null;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const area = areaFor(request.nextUrl.pathname);
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // No session cookie means this request is about to be redirected to
  // login by the page's own auth check anyway — nothing real to log yet.
  // Hashing (never decrypting) the raw cookie value is deliberate: this
  // file only needs a stable per-login correlator for grouping page views
  // into a session, never the session's actual contents.
  if (area && sessionCookie) {
    const sessionHash = createHash("sha256").update(sessionCookie).digest("hex");
    const referrer = request.headers.get("referer");
    event.waitUntil(
      recordPageView({ sessionHash, area, path: request.nextUrl.pathname, referrer }).catch(() => {
        // Best-effort — analytics should never be able to break a real
        // page load.
      })
    );
  }

  return NextResponse.next();
}
