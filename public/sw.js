// Push-notification service worker. Deliberately minimal — this app has no
// offline mode or asset caching (that's a separate, much bigger feature);
// this file exists purely so the browser has something to register for Web
// Push, which requires an active service worker to receive a "push" event
// and show a notification even when the site isn't open in a tab.
// See src/components/PushNotifications.tsx for the registration side.

self.addEventListener("push", (event) => {
  let data = { title: "Steadwell", body: "You have a new notification." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON payload (shouldn't happen — src/lib/webPush.ts always sends
    // JSON) — fall back to the generic message above rather than throwing
    // and dropping the notification entirely.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

// Clicking the notification focuses an already-open Steadwell tab if there
// is one, rather than always opening a fresh tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
