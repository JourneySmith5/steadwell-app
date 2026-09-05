// The session cookie's name, split out from session.ts so it can be
// imported by src/proxy.ts without also pulling in iron-session/
// next/headers (proxy.ts only needs the raw cookie's name/value to hash
// for internal-analytics session correlation — see
// src/lib/repo/pageViews.ts — never to decrypt or read its contents).
export const SESSION_COOKIE_NAME = "steadwell_session";
