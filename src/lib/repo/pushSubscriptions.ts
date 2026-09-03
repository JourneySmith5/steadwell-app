import { run, all, newId, nowIso } from "@/lib/db/client";

interface PushSubscriptionDbRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

function fromRow(row: PushSubscriptionDbRow): PushSubscriptionRow {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: row.created_at,
  };
}

// Upsert by endpoint — a browser re-subscribing (e.g. after clearing site
// data, or the subscription silently rotating, which push services do)
// sends the same shape again; this keeps it to one row per real device
// rather than accumulating stale duplicates.
export async function savePushSubscription(params: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await run(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
     VALUES ($id, $userId, $endpoint, $p256dh, $auth, $now)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $userId, p256dh = $p256dh, auth = $auth`,
    { $id: newId(), $userId: params.userId, $endpoint: params.endpoint, $p256dh: params.p256dh, $auth: params.auth, $now: nowIso() }
  );
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const rows = await all<PushSubscriptionDbRow>("SELECT * FROM push_subscriptions WHERE user_id = $userId", {
    $userId: userId,
  });
  return rows.map(fromRow);
}

// Every subscription belonging to any user with one of the given roles —
// how sendPushToCoach reaches every coach-side account (owner + every
// coach) for a business-wide event (new application, payment received),
// without needing to know a specific user id ahead of time.
export async function listPushSubscriptionsForRoles(roles: string[]): Promise<PushSubscriptionRow[]> {
  const rows = await all<PushSubscriptionDbRow>(
    `SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE u.role = ANY($roles::text[])`,
    { $roles: roles }
  );
  return rows.map(fromRow);
}

// Called when a push provider reports a subscription is gone (HTTP 404/410
// — the browser unsubscribed, cleared site data, or the user uninstalled)
// so it stops being retried forever. See src/lib/webPush.ts.
export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await run("DELETE FROM push_subscriptions WHERE endpoint = $endpoint", { $endpoint: endpoint });
}
