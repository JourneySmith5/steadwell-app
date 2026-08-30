import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { findUserByEmail, createUser, markEmailVerified } from "@/lib/repo/users";
import { hashPassword } from "@/lib/password";

// One-time, browser-visitable setup helper. The Coach account normally comes
// from `npm run seed` (scripts/seed.ts) run against DATABASE_URL — but that
// requires a local Node install and a database connection most non-technical
// deploys won't have handy. This route does the exact same thing, reachable
// by visiting a URL once from the deployed site instead.
//
// Protected by CRON_SECRET as a query param (not a header — this is meant to
// be typed into a browser address bar, not curl'd). Deliberately reuses the
// same secret already configured for the cron route rather than introducing
// a new env var. DELETE THIS FILE (or at minimum remove/rotate CRON_SECRET)
// once you've used it — it's a standing way to create coach accounts as long
// as it exists and the secret is known.
//
// GET /api/setup/seed-coach?secret=<CRON_SECRET>&email=<your login email>
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const email = url.searchParams.get("email");

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured on this deployment." }, { status: 500 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Add ?email=you@example.com to the URL — that's the address you'll log in with." },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({
      message: `An account already exists for ${email}. If you forgot the password, this route can't reset it — that's a separate flow.`,
    });
  }

  const password = `Sw-${randomBytes(6).toString("hex")}!A`;
  const passwordHash = await hashPassword(password);

  await createUser({
    email,
    passwordHash,
    role: "coach",
    emailVerifyToken: "seeded-not-needed",
    emailVerifyExpiresAt: new Date(0).toISOString(),
  });

  const user = (await findUserByEmail(email))!;
  await markEmailVerified(user.id);

  return NextResponse.json({
    message: "Coach account created. Save this password now — it will not be shown again. Log in at /login, then you'll be prompted to set up two-factor authentication.",
    email,
    password,
  });
}
