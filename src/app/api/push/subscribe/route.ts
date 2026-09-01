import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { savePushSubscription } from "@/lib/repo/pushSubscriptions";

// Called from src/components/PushNotifications.tsx right after the browser
// grants notification permission and PushManager.subscribe() succeeds. A
// plain fetch route rather than a Server Action because the payload is a
// PushSubscription object serialized on the client, not form data, and this
// needs to work for whichever role (coach or client) is currently logged
// in — getCurrentUser() covers both instead of requireCoach/requireClient
// picking one.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Malformed subscription." }, { status: 400 });
  }

  await savePushSubscription({ userId: user.id, endpoint, p256dh, auth });
  return NextResponse.json({ ok: true });
}
