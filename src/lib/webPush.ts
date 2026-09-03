import "server-only";
import webpush from "web-push";
import {
  listPushSubscriptionsForUser,
  listPushSubscriptionsForRoles,
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRow,
} from "@/lib/repo/pushSubscriptions";

// Same "falls back to a labeled no-op until configured" pattern as
// src/lib/stripe.ts and src/lib/email.ts's getResend — so this runs
// identically whether or not VAPID keys have been generated and set yet.
let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:steadwell@boldlybuilt.group";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export const PUSH_CONFIGURED = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

async function sendToSubscription(sub: PushSubscriptionRow, payload: { title: string; body: string; url?: string }) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    // 404/410 means the push service itself says this subscription is
    // gone (browser unsubscribed, site data cleared, app uninstalled) —
    // clean it up so it's not retried forever. Any other error (network
    // blip, provider hiccup) is logged and swallowed: a failed push should
    // never be the thing that breaks the email/portal flow it rides
    // alongside — see every call site below, none of them await-fail the
    // caller on this.
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await deletePushSubscriptionByEndpoint(sub.endpoint);
    } else {
      console.error(`[webPush] failed to send to ${sub.endpoint}:`, err);
    }
  }
}

// Fire-and-forget by design — every call site awaits this (so a real
// failure is visible in logs) but never lets a push failure block or roll
// back the email/status-change it accompanies. Silently does nothing until
// VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are set (see README) or if the target
// user has no subscriptions (hasn't opted in, or opted in on a browser that
// doesn't support it — e.g. iPhone Safari not added to the Home Screen).
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) return;
  try {
    const subs = await listPushSubscriptionsForUser(userId);
    await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
  } catch (err) {
    // Belt-and-suspenders on top of sendToSubscription's own try/catch —
    // a failure fetching the subscription list itself (DB hiccup) should
    // never propagate into the email/status-change flow this rides
    // alongside. See the "fire-and-forget by design" note above.
    console.error(`[webPush] sendPushToUser(${userId}) failed:`, err);
  }
}

// Coach-facing pushes (new application, payment received) don't have a
// single known userId to target ahead of time, and are business-wide
// events every coach-side account should hear about — this reaches every
// subscription belonging to the owner or any coach. A specific client's
// message thread notifications (src/lib/messages.ts) are targeted more
// narrowly, straight to that client's assigned coach + the owner, via
// sendPushToUser instead — not every coach needs paging for every other
// coach's client.
export async function sendPushToCoach(payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) return;
  try {
    const subs = await listPushSubscriptionsForRoles(["owner", "coach"]);
    await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
  } catch (err) {
    console.error("[webPush] sendPushToCoach failed:", err);
  }
}
