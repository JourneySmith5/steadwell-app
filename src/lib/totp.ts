import "server-only";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { findUserById, setTotpSecret } from "@/lib/repo/users";

// Required 2FA for every client before secure portal access (§2).

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totpFor(email: string, secret: string) {
  return new OTPAuth.TOTP({
    issuer: "Steadwell",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export async function generateTotpQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = totpFor(email, secret).toString();
  return QRCode.toDataURL(uri);
}

export function verifyTotpToken(email: string, secret: string, token: string): boolean {
  const totp = totpFor(email, secret);
  // Allow one 30s step of clock drift in either direction.
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// Reuses an existing not-yet-enabled secret so refreshing the setup page
// doesn't invalidate a QR code the user already scanned.
export async function getOrCreatePendingTotpSecret(userId: string): Promise<{ secret: string; qrDataUrl: string }> {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  let secret = user.totpSecret;
  if (!secret) {
    secret = generateTotpSecret();
    await setTotpSecret(userId, secret);
  }
  const qrDataUrl = await generateTotpQrDataUrl(user.email, secret);
  return { secret, qrDataUrl };
}
