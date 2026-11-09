/* MathProject service worker — duel invite notifications only (spec §7.4).
   Registered by src/duel/push.js when a student turns notifications on.
   On purpose: NO fetch handler and NO caching, so it never changes how the site loads.
   The push message comes from the edge function duel-push:
     {t:'invite', id, title, body, url:'/duel', tag:'duel-<id>'}                       */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (_) { m = {}; }
  const title = typeof m.title === "string" && m.title ? m.title : "הזמנה לדו-קרב!";
  const url = typeof m.url === "string" && m.url.startsWith("/") ? m.url : "/duel";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: typeof m.body === "string" ? m.body : "",
      icon: "/icon-192.png",
      badge: "/push-badge.png",
      lang: "he",
      dir: "rtl",
      tag: typeof m.tag === "string" && m.tag ? m.tag : "duel-invite",   // the same invite twice → one notification
      renotify: false,
      data: { url, id: m.id || null },
    }).then(() => tell({ type: "duel-push", id: m.id || null }))
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/duel";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // a tab of the site that is already on the duels: bring it forward (and to /duel).
    // A tab on any other page (a student mid-exercise) is never taken over: new window instead.
    const tab = all.find((c) => {
      const u = new URL(c.url);
      return u.origin === self.location.origin && (u.pathname === "/duel" || u.pathname.startsWith("/duel/"));
    });
    if (tab) {
      try { await tab.focus(); } catch (_) {}
      if (new URL(tab.url).pathname !== url) { try { await tab.navigate(url); } catch (_) {} }
      return;
    }
    await self.clients.openWindow(url);
  })());
});

// open tabs hear that a notification was shown (used by the tests; harmless otherwise)
async function tell(msg) {
  try {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) c.postMessage(msg);
  } catch (_) {}
}
