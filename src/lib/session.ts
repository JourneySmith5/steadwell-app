import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  role?: "coach" | "client";
  // Set once the TOTP challenge has been passed for this session — a
  // password-only login is not enough to reach secure portal content (§2).
  totpVerified?: boolean;
  // Set right after password check, before the TOTP step, so the /login/verify
  // page knows which user is completing the challenge without re-prompting
  // for a password.
  pendingUserId?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "steadwell_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
