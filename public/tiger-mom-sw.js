self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Tiger Mom is checking in", {
      body: data.body ?? "No activity logged today. Your cousin has apparently discovered calendars.",
      icon: "/favicon.ico",
      tag: data.tag ?? "tiger-mom-daily",
      data: { url: "/home" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients[0];
      if (existing) return existing.focus();
      return self.clients.openWindow(event.notification.data?.url ?? "/home");
    }),
  );
});