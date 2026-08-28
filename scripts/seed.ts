// Seeds the single Coach (admin) account. Run with `npm run seed`.
// Generates a random password and prints it once — save it, it isn't stored
// anywhere else. Change it (or the seed) before using this for anything real.

import { randomBytes } from "node:crypto";
import { findUserByEmail, createUser } from "../src/lib/repo/users";
import { hashPassword } from "../src/lib/password";
import { ensureSeedDiscountCodes } from "../src/lib/repo/discountCodes";
import { SEED_DISCOUNT_CODES } from "../src/lib/enums";

async function main() {
  const email = process.env.SEED_COACH_EMAIL ?? "coach@steadwellcoaching.com";
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`Coach account already exists for ${email} — skipping.`);
  } else {
    const password = process.env.SEED_COACH_PASSWORD ?? `Sw-${randomBytes(6).toString("hex")}!A`;
    const passwordHash = await hashPassword(password);

    await createUser({
      email,
      passwordHash,
      role: "coach",
      emailVerifyToken: "seeded-not-needed",
      emailVerifyExpiresAt: new Date(0).toISOString(),
    });

    // Coach accounts don't go through the client email-verification gate.
    const { markEmailVerified } = await import("../src/lib/repo/users");
    const user = (await findUserByEmail(email))!;
    await markEmailVerified(user.id);

    console.log("Coach account created:");
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    console.log("You'll be prompted to set up 2FA on first login.");
  }

  // Idempotent — does nothing once these already exist (§9, disabled by
  // default; Coach turns them on from /coach/settings/discount-codes).
  await ensureSeedDiscountCodes([...SEED_DISCOUNT_CODES]);
}

main().then(() => process.exit(0));
